/**
 * electron-builder afterPack hook
 * 目标：让 XMagic 的大体积资源（win/res + win/x64）只存在于
 *       app.asar.unpacked 里，完全不进 app.asar，避免重复占空间。
 *
 * 原理：electron-builder 打完 app.asar 后，asar 里还留着完整原始文件，
 *       asarUnpack 只是把它们复制到 unpacked，没有从 asar 里删除。
 *       这个脚本重新打一个干净的 asar（排除 XMagic res/x64），
 *       替换原来的 app.asar。
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const resourcesDir = path.join(appOutDir, 'resources');
  const asarPath = path.join(resourcesDir, 'app.asar');
  const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked');

  if (!fs.existsSync(asarPath)) {
    console.log('[afterPack] app.asar not found, skip.');
    return;
  }

  // 检查 unpacked 里是否有 XMagic（说明 asarUnpack 生效了）
  const xmagicUnpackedDir = path.join(
    unpackedDir,
    'node_modules',
    'trtc-electron-plugin-xmagic',
    'plugin',
    'XMagic',
    'win'
  );
  if (!fs.existsSync(xmagicUnpackedDir)) {
    console.log('[afterPack] XMagic not in unpacked, skip asar rebuild.');
    return;
  }

  console.log('[afterPack] Rebuilding app.asar to strip duplicate XMagic files...');

  // 1. 备份原 asar
  const backupPath = asarPath + '.bak';
  fs.copyFileSync(asarPath, backupPath);

  // 2. 解压到临时目录
  const tmpDir = path.join(resourcesDir, '_asar_rebuild_tmp');
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    execSync(`npx asar extract "${asarPath}" "${tmpDir}"`, {
      stdio: 'pipe',
      cwd: packager.appDir,
    });

    // 3. 删除 tmp 里的 XMagic 大目录（res + x64），因为 unpacked 里已有
    const rmDirs = [
      path.join(tmpDir, 'node_modules', 'trtc-electron-plugin-xmagic', 'plugin', 'XMagic', 'win', 'res'),
      path.join(tmpDir, 'node_modules', 'trtc-electron-plugin-xmagic', 'plugin', 'XMagic', 'win', 'x64'),
    ];
    for (const d of rmDirs) {
      if (fs.existsSync(d)) {
        const size = dirSizeMB(d);
        fs.rmSync(d, { recursive: true, force: true });
        console.log(`[afterPack] Removed ${d} (${size} MB)`);
      }
    }

    // 4. 重新打包 asar
    const newAsar = asarPath + '.new';
    execSync(`npx asar pack "${tmpDir}" "${newAsar}"`, {
      stdio: 'pipe',
      cwd: packager.appDir,
    });

    // 5. 替换
    fs.unlinkSync(asarPath);
    fs.renameSync(newAsar, asarPath);
    fs.rmSync(backupPath, { force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const newSize = (fs.statSync(asarPath).size / 1024 / 1024).toFixed(2);
    console.log(`[afterPack] New app.asar size: ${newSize} MB`);
  } catch (e) {
    console.error('[afterPack] asar rebuild failed, restoring backup:', e.message);
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(asarPath);
        fs.renameSync(backupPath, asarPath);
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) { /* ignore cleanup errors */ }
  }
};

function dirSizeMB(dir) {
  let total = 0;
  try {
    for (const f of fs.readdirSync(dir, { recursive: true })) {
      const fp = path.join(dir, f);
      try {
        const st = fs.statSync(fp);
        if (st.isFile()) total += st.size;
      } catch (_) { /* skip broken symlinks */ }
    }
  } catch (_) { /* skip */ }
  return (total / 1024 / 1024).toFixed(2);
}
