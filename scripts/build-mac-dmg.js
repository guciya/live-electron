#!/usr/bin/env node
/**
 * Mac DMG 一键打包脚本
 *
 * 用法（在 Mac 上）：
 *   node scripts/build-mac-dmg.js          # 默认 x64
 *   node scripts/build-mac-dmg.js arm64    # Apple Silicon
 *   node scripts/build-mac-dmg.js both     # 两个架构
 *
 * 产物（dist/mac/）：
 *   NikoLive.app            ← 标准 App
 *   NikoLive.dmg            ← DMG，里面含 App + 安装.command + 箭头引导
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BUILD = path.join(ROOT, 'build');
const PRODUCT_NAME = 'NikoLive';
const VOLUME_NAME = PRODUCT_NAME;
const DMG_NAME = `${PRODUCT_NAME}.dmg`;
const INSTALL_CMD = path.join(BUILD, 'install.command');

const archArg = (process.argv[2] || 'x64').toLowerCase();
const arches = archArg === 'both' ? ['x64', 'arm64'] : [archArg];

function run(cmd, opts = {}) {
  console.log(`\n▶ ${cmd}`);
  try {
    return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
  } catch (e) {
    console.error(`\n❌ 命令失败: ${cmd}`);
    process.exit(1);
  }
}

function step(msg) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('═'.repeat(60));
}

// ── 前置检查 ────────────────────────────────────────────
const isMac = os.platform() === 'darwin';
if (!isMac) {
  console.log('⚠️  当前系统不是 macOS');
  console.log('   electron-builder 无法在 Windows/Linux 上生成 macOS 的 .app / .dmg');
  console.log('');
  console.log('   解决方案（任选其一）：');
  console.log('   ① 在 Mac 上克隆代码执行 npm run pack:mac');
  console.log('   ② push 到 GitHub，用仓库根目录的 .github/workflows/build-mac.yml');
  console.log('      触发 CI → macos-latest runner 自动出 DMG 到 Artifacts');
  console.log('');
  console.log('   脚本继续运行，但 electron-builder --mac 会失败 ✗');
  console.log('');
}
if (!fs.existsSync(INSTALL_CMD)) {
  console.error(`❌ 找不到 install.command: ${INSTALL_CMD}`);
  process.exit(1);
}

// ── Step 1: 构建前端 ───────────────────────────────────
step('Step 1/5: 构建前端资源 (vue-cli-service build)');
run('npm run build');

// ── Step 2: electron-builder 生成 .app ─────────────────
step(`Step 2/5: electron-builder 生成 .app (${arches.join(', ')})`);
for (const arch of arches) {
  console.log(`\n—— 架构 ${arch} ——`);
  run(`npx electron-builder --mac ${arch} --dir`); // --dir = 只生成 app 不自动做 dmg
}

// electron-builder --dir 默认产物在 dist/mac-arm64 或 dist/mac
const archDirMap = {
  x64: path.join(DIST, 'mac'),
  arm64: path.join(DIST, 'mac-arm64'),
};

for (const arch of arches) {
  const appDir = archDirMap[arch];
  if (!fs.existsSync(appDir)) {
    console.error(`❌ 找不到 ${appDir}，electron-builder 可能没生成`);
    process.exit(1);
  }
  const appPath = path.join(appDir, `${PRODUCT_NAME}.app`);
  if (!fs.existsSync(appPath)) {
    // 尝试查找
    const found = fs.readdirSync(appDir).filter((f) => f.endsWith('.app'));
    if (found.length === 0) {
      console.error(`❌ ${appDir} 里没有 .app`);
      process.exit(1);
    }
    console.warn(`⚠️  没找到精确名 ${PRODUCT_NAME}.app，使用 ${found[0]}`);
    appPath = path.join(appDir, found[0]);
  }

  // 统一命名为 NikoLive.app（防止 electron-builder 用中文 productName）
  const renamedApp = path.join(appDir, `${PRODUCT_NAME}.app`);
  if (path.resolve(appPath) !== path.resolve(renamedApp)) {
    if (fs.existsSync(renamedApp)) fs.rmSync(renamedApp, { recursive: true, force: true });
    fs.renameSync(appPath, renamedApp);
  }

  // ── Step 3: 准备 staging 目录 ──────────────────────
  step(`Step 3/5 [${arch}]: 准备 staging 目录`);
  const staging = path.join(DIST, `dmg-stage-${arch}`);
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  fs.cpSync(renamedApp, path.join(staging, `${PRODUCT_NAME}.app`), { recursive: true });
  fs.copyFileSync(INSTALL_CMD, path.join(staging, '安装.command'));
  fs.chmodSync(path.join(staging, '安装.command'), 0o755);

  // ── Step 4: 生成 DMG ────────────────────────────────
  step(`Step 4/5 [${arch}]: hdiutil 创建 DMG`);
  const dmgPath = path.join(DIST, `${PRODUCT_NAME}-${arch}.dmg`);
  if (fs.existsSync(dmgPath)) fs.rmSync(dmgPath, { force: true });
  run(`hdiutil create -volname "${VOLUME_NAME}" -srcfolder "${staging}" -ov -format UDZO "${dmgPath}"`);

  // ── Step 5: 设置 DMG 视图（背景 + 箭头 + 图标位置）──
  step(`Step 5/5 [${arch}]: DMG 视图美化`);
  setupDmgView(dmgPath);

  // 清理 staging
  fs.rmSync(staging, { recursive: true, force: true });
  console.log(`\n✅ [${arch}] 完成: ${dmgPath}`);
}

console.log(`\n${'═'.repeat(60)}`);
console.log('  🎉 全部完成！产物在 dist/ 目录：');
for (const arch of arches) {
  console.log(`     ${PRODUCT_NAME}-${arch}.dmg`);
}
console.log('═'.repeat(60));

// ── 辅助：设置 DMG Finder 窗口布局 ────────────────────
function setupDmgView(dmgPath) {
  // 挂载
  const mountPoint = `/Volumes/${VOLUME_NAME}`;
  run(`hdiutil attach "${dmgPath}" -nobrowse -quiet`);

  try {
    // 等 Finder 加载
    execSync('sleep 2');

    // AppleScript 设置窗口大小 + 位置 + 显示选项 + 图标位置 + 背景
    // Finder 视图：1200×700 窗口，app 放左边，安装.command 放右边（带箭头引导）
    const osa = `
      tell application "Finder"
        tell disk "${VOLUME_NAME}"
          open
          set current view of container window to icon view
          set toolbar visible of container window to false
          set statusbar visible of container window to false
          set the bounds of container window to {100, 100, 1300, 800}
          set the viewOptions to {view size:96, arrangement:fixed grid, icon size:110, text size:13, label position:bottom, shows icon preview:true, shows item info:false}
          set background picture of container window to ""
          update without registering applications
          delay 1
          -- 定位 App（左边）
          set position of item "${PRODUCT_NAME}.app" of container window to {180, 300}
          -- 定位 安装.command（右边）
          set position of item "安装.command" of container window to {720, 300}
          update without registering applications
          delay 1
          close
        end tell
      end tell
    `;
    run(`osascript -e ${JSON.stringify(osa).replace(/"/g, '\\"')}`);

    // 清掉 DS_Store（让位置设置下次打开仍生效）
    run(`hdiutil detach "${mountPoint}" -quiet`);
  } catch (e) {
    console.warn('⚠️  DMG 视图设置失败，这不是致命的，DMG 仍可用');
    try { execSync(`hdiutil detach "${mountPoint}" -quiet`); } catch (_) {}
  }
}
