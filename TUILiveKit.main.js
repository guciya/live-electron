const {
  app,
  BrowserWindow,
  systemPreferences,
  crashReporter,
  ipcMain,
  Menu,
  Tray,
  shell,
  net,
} = require('electron');
const { exec, spawn, execSync } = require('child_process');
const path = require('path');
const zlib = require('zlib');
const EventEmitter = require('events');

const logPrefix = '[TUILiveKit.main]';

// ==================== 托盘菜单图标（16x16 PNG，运行时绘制，免新增资源文件） ====================
const TRAY_ICON_SIZE = 16;
// 中性灰蓝色，深色/浅色系统菜单下都可见
const TRAY_ICON_COLOR = [138, 143, 152];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const pngCrcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function pngCrc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) {
    crc = pngCrcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(pngCrc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodeTrayPng(rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(TRAY_ICON_SIZE, 0);
  ihdr.writeUInt32BE(TRAY_ICON_SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = TRAY_ICON_SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * TRAY_ICON_SIZE);
  for (let y = 0; y < TRAY_ICON_SIZE; y += 1) {
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function trayPx(img, x, y) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= TRAY_ICON_SIZE || yi < 0 || yi >= TRAY_ICON_SIZE) {
    return;
  }
  const i = (yi * TRAY_ICON_SIZE + xi) * 4;
  img[i] = TRAY_ICON_COLOR[0];
  img[i + 1] = TRAY_ICON_COLOR[1];
  img[i + 2] = TRAY_ICON_COLOR[2];
  img[i + 3] = 255;
}

function trayHLine(img, x0, x1, y) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) trayPx(img, x, y);
}

function trayVLine(img, y0, y1, x) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) trayPx(img, x, y);
}

function trayRect(img, x0, y0, x1, y1) {
  trayHLine(img, x0, x1, y0);
  trayHLine(img, x0, x1, y1);
  trayVLine(img, y0, y1, x0);
  trayVLine(img, y0, y1, x1);
}

function trayFillRect(img, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y += 1) trayHLine(img, x0, x1, y);
}

/** 圆环（可留角度缺口，用于重启图标） */
function trayRing(img, cx, cy, r, thickness, gapAngles) {
  for (let y = 0; y < TRAY_ICON_SIZE; y += 1) {
    for (let x = 0; x < TRAY_ICON_SIZE; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r - thickness || d > r + thickness) {
        continue;
      }
      if (gapAngles) {
        const ang = Math.atan2(dy, dx) * 180 / Math.PI;
        if (ang >= gapAngles[0] && ang <= gapAngles[1]) {
          continue;
        }
      }
      trayPx(img, x, y);
    }
  }
}

/** 朝右实心三角箭头：cx 为底边 x，size 为长度 */
function trayArrowRight(img, cx, cy, size) {
  for (let x = 0; x <= size; x += 1) {
    const half = size - x;
    trayVLine(img, cy - half, cy + half, cx + x);
  }
}

const trayIconBuilders = {
  // 显示窗口：外框 + 标题栏横线
  show(img) {
    trayRect(img, 2, 3, 13, 13);
    trayRect(img, 3, 4, 12, 12);
    trayHLine(img, 2, 13, 6);
  },
  // 公会|家族：双人剪影
  users(img) {
    trayRing(img, 6, 6, 2.4, 1);
    trayRing(img, 11.5, 7, 1.8, 0.9);
    trayFillRect(img, 2, 11, 10, 13);
    trayFillRect(img, 10, 11, 14, 12);
  },
  // 提现：钱包
  wallet(img) {
    trayRect(img, 1, 5, 14, 13);
    trayRect(img, 2, 6, 13, 12);
    trayFillRect(img, 9, 8, 14, 10);
  },
  // 家族入驻：房子
  home(img) {
    for (let i = 0; i <= 6; i += 1) {
      trayPx(img, 8 - i, 3 + i);
      trayPx(img, 8 + i, 3 + i);
      trayPx(img, 8 - i, 4 + i);
      trayPx(img, 8 + i, 4 + i);
    }
    trayRect(img, 4, 9, 12, 14);
    trayFillRect(img, 7, 11, 9, 14);
  },
  // 公会入驻：楼宇
  building(img) {
    trayRect(img, 4, 2, 12, 14);
    trayRect(img, 5, 3, 11, 13);
    [5, 8].forEach((y) => {
      trayPx(img, 7, y);
      trayPx(img, 9, y);
    });
    trayFillRect(img, 7, 12, 9, 14);
  },
  // 重启：带缺口的圆环 + 箭头
  restart(img) {
    trayRing(img, 8, 8.5, 4.6, 1, [-95, -5]);
    trayArrowRight(img, 8, 4, 3);
  },
  // 退出：门 + 向右箭头
  exit(img) {
    trayRect(img, 2, 2, 9, 13);
    trayHLine(img, 6, 12, 7);
    trayHLine(img, 6, 12, 8);
    trayArrowRight(img, 11, 7.5, 2);
  },
};

const trayIconCache = {};

function trayIcon(name) {
  if (!trayIconCache[name]) {
    const { nativeImage } = require('electron');
    const img = new Uint8Array(TRAY_ICON_SIZE * TRAY_ICON_SIZE * 4);
    trayIconBuilders[name](img);
    trayIconCache[name] = nativeImage.createFromBuffer(encodeTrayPng(img));
  }
  return trayIconCache[name];
}

let language = 'zh-CN';
let lastChildWindowCommand = '';

const basicInfo = {
  userInfo: null,
};

const windowMap = {
  main: null,
  child: null,
  mainCover: null,
  confirm: null,
  // 礼物特效覆盖窗口：原生视频窗口永远在 DOM 之上，礼物必须放到同级透明窗口里播放
  giftOverlay: null,
};

const coverWindowRelativeBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

// 礼物覆盖窗口相对于主窗口内容区的坐标（视频预览区域）
const giftOverlayRelativeBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};
/** 用户信息卡片是否正在覆盖窗口中展示（展示期间窗口全尺寸、可点击，礼物不再重定位窗口） */
let overlayUserCardVisible = false;

const liveKitEmitter = new EventEmitter();
let isQuitting = false;

// ============== App Quit Race Condition Fix ==============
// Handles the race condition when user quickly closes the window before
// renderer-side listeners (app-request-quit / confirm dialog) are mounted.
//
// Solution: 1) Main process timeout fallback
//           2) Confirm window ready handshake
//           3) Quit request retry mechanism
const QUIT_TIMEOUT_MS = 5000; // Force quit if no response within 5 seconds
const QUIT_RETRY_INTERVAL_MS = 200; // Retry interval when confirm window not ready
let quitTimeoutTimer = null;
let quitRetryTimer = null;
let isConfirmWindowReady = false;
let pendingQuitRequest = false;

function clearQuitTimers() {
  if (quitTimeoutTimer) {
    clearTimeout(quitTimeoutTimer);
    quitTimeoutTimer = null;
  }
  if (quitRetryTimer) {
    clearInterval(quitRetryTimer);
    quitRetryTimer = null;
  }
}

/**
 * Shared handler for quit-confirmed from both V2 IPC router and direct IPC channel.
 * Clears timers, sets quit state, and closes all windows.
 */
function handleQuitConfirmed() {
  clearQuitTimers();
  pendingQuitRequest = false;
  isQuitting = true;
  if (windowMap.giftOverlay && !windowMap.giftOverlay.isDestroyed()) {
    windowMap.giftOverlay.close();
  }
  windowMap.giftOverlay = null;

  if (windowMap.mainCover && !windowMap.mainCover.isDestroyed()) {
    windowMap.mainCover.close();
  }
  windowMap.mainCover = null;

  if (windowMap.confirm && !windowMap.confirm.isDestroyed()) {
    windowMap.confirm.close();
  }
  windowMap.confirm = null;

  if (windowMap.main && !windowMap.main.isDestroyed()) {
    windowMap.main.close();
  }

  if (windowMap.child && !windowMap.child.isDestroyed()) {
    windowMap.child.close();
  }
  windowMap.child = null;
}

/**
 * Shared handler for quit-cancel from both V2 IPC router and direct IPC channel.
 * Clears timers and resets quit state.
 */
function handleQuitCancel() {
  clearQuitTimers();
  pendingQuitRequest = false;
  isQuitting = false;
}

function forceQuitApp() {
  console.log(`${logPrefix} forceQuitApp: timeout reached, forcing quit`);
  clearQuitTimers();
  isQuitting = true;
  pendingQuitRequest = false;

  // Close all windows
  if (windowMap.giftOverlay && !windowMap.giftOverlay.isDestroyed()) {
    windowMap.giftOverlay.close();
  }
  windowMap.giftOverlay = null;

  if (windowMap.mainCover && !windowMap.mainCover.isDestroyed()) {
    windowMap.mainCover.close();
  }
  windowMap.mainCover = null;

  if (windowMap.confirm && !windowMap.confirm.isDestroyed()) {
    windowMap.confirm.close();
  }
  windowMap.confirm = null;

  if (windowMap.main && !windowMap.main.isDestroyed()) {
    windowMap.main.close();
  }

  if (windowMap.child && !windowMap.child.isDestroyed()) {
    windowMap.child.close();
  }
  windowMap.child = null;
}

function sendQuitRequestToRenderer() {
  if (isWebContentsAlive(windowMap.main)) {
    console.log(`${logPrefix} sendQuitRequestToRenderer: sending app-request-quit`);
    sendToWindow(windowMap.main, 'app-request-quit');
  }
}

function initiateQuitSequence() {
  if (isQuitting) {
    return;
  }

  console.log(`${logPrefix} initiateQuitSequence: isConfirmWindowReady=${isConfirmWindowReady}`);

  // Start timeout fallback timer
  if (!quitTimeoutTimer) {
    quitTimeoutTimer = setTimeout(() => {
      console.log(`${logPrefix} quit timeout reached, no response from renderer`);
      forceQuitApp();
    }, QUIT_TIMEOUT_MS);
  }

  if (isConfirmWindowReady) {
    // Confirm window is ready, send quit request immediately
    sendQuitRequestToRenderer();
    pendingQuitRequest = false;
  } else {
    // Confirm window not ready yet, mark pending and start retry
    pendingQuitRequest = true;
    console.log(`${logPrefix} confirm window not ready, will retry when ready`);

    if (!quitRetryTimer) {
      quitRetryTimer = setInterval(() => {
        if (isConfirmWindowReady && pendingQuitRequest) {
          console.log(`${logPrefix} confirm window now ready, sending pending quit request`);
          clearInterval(quitRetryTimer);
          quitRetryTimer = null;
          sendQuitRequestToRenderer();
          pendingQuitRequest = false;
        }
      }, QUIT_RETRY_INTERVAL_MS);
    }
  }
}
// ============== End of App Quit Race Condition Fix ==============

function isWindowAlive(win) {
  return !!win && !win.isDestroyed();
}

function isWebContentsAlive(win) {
  return isWindowAlive(win) && !!win.webContents && !win.webContents.isDestroyed();
}

function sendToWindow(win, channel, ...args) {
  if (!isWebContentsAlive(win)) {
    return false;
  }
  win.webContents.send(channel, ...args);
  return true;
}

function postMessageToWindow(win, channel, message, transfer = []) {
  if (!isWebContentsAlive(win)) {
    return false;
  }
  win.webContents.postMessage(channel, message, transfer);
  return true;
}

/**
 * Get default window size for a given panel type.
 * Used by SHOW_CHILD_PANEL message handler when no explicit windowSize is provided.
 */
function getDefaultPanelSize(panelType) {
  const [mainW, mainH] = isWindowAlive(windowMap.main)
    ? windowMap.main.getSize()
    : [1200, 800];
  const sizeMap = {
    'Camera':              { width: 680, height: 600 },
    'Screen':              { width: mainW - 150, height: mainH - 80 },
    'Image':               { width: 600, height: 500 },
    'Rename':              { width: 480, height: 176 },
    'CoGuestConnection':   { width: 520, height: 560 },
    'CoHostConnection':    { width: 520, height: 640 },
    'Setting':             { width: 600, height: 560 },
    'AddBgm':              { width: 600, height: 560 },
    'ReverbVoice':         { width: 600, height: 560 },
    'ChangeVoice':         { width: 600, height: 560 },
    'PhoneMirror':         { width: 600, height: 560 },
    'OnlineVideo':         { width: 600, height: 380 },
    'VideoFile':           { width: 600, height: 360 },
    'UserProfile':         { width: 600, height: 460 },
    'LayoutConfig':        { width: 480, height: 320 },
    'Music':               { width: 520, height: 560 },
    'LiveTitleSetting':    { width: 600, height: 560 },
  };
  return sizeMap[panelType] || { width: 600, height: 400 };
}

// ============== Main Process Action Handlers ==============
// Centralized handler registry for renderer-to-main-process actions.
// Messages with `to: 'electron-main'` are consumed here and NOT forwarded to any renderer window.
const mainProcessHandlers = {
  'minimizeWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.minimize();
    }
  },
  'maximizeWindow': (payload, _from) => {
    if (isWindowAlive(windowMap.main)) {
      if (payload && payload.maximize) {
        windowMap.main.maximize();
      } else {
        windowMap.main.unmaximize();
      }
    }
  },
  'closeWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.close();
    }
  },
  'setWindowSize': (payload, _from) => {
    const { target, width, height } = payload || {};
    const win = windowMap[target];
    if (isWindowAlive(win)) {
      win.setSize(width, height, true);
      win.setContentSize(width, height, true);
    }
  },
  'setCoverBounds': (payload, _from) => {
    const { top, left, width, height } = payload || {};
    coverWindowRelativeBounds.x = Math.round(left);
    coverWindowRelativeBounds.y = Math.round(top);
    coverWindowRelativeBounds.width = Math.round(width);
    coverWindowRelativeBounds.height = Math.round(height);

    const mainBounds = isWindowAlive(windowMap.main)
      ? windowMap.main.getContentBounds()
      : null;
    if (mainBounds && isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.setBounds({
        x: coverWindowRelativeBounds.x + mainBounds.x,
        y: coverWindowRelativeBounds.y + mainBounds.y,
        width: coverWindowRelativeBounds.width,
        height: coverWindowRelativeBounds.height,
      });
    }
  },
  'showCoverWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.show();
    }
  },
  'hideCoverWindow': (_payload, _from) => {
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.hide();
    }
  },
  'setLanguage': (payload, _from) => {
    language = payload;
  },
  'showContextMenu': (_payload, from) => {
    const win = windowMap[from];
    if (!isWindowAlive(win)) return;
    const template = [
      {
        label: isZhCN() ? '排序' : 'Sort',
        submenu: [
          { 'label': isZhCN() ? '上移' : 'Move up', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-up'); } },
          { 'label': isZhCN() ? '下移' : 'Move down', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-down'); } },
          { 'label': isZhCN() ? '移至顶部' : 'Move to top', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-top'); } },
          { 'label': isZhCN() ? '移至底部' : 'Move to bottom', 'click': () => { sendToWindow(win, 'context-menu-command', 'move-bottom'); } },
        ]
      },
      {
        label: isZhCN() ? '变换' : 'Transform',
        submenu: [
          { 'label': isZhCN() ? '顺时针旋转90度' : 'Rotate 90 degrees CW', 'click': () => { sendToWindow(win, 'context-menu-command', 'transform-clockwise-90'); } },
          { 'label': isZhCN() ? '逆时针旋转90度' : 'Rotate 90 degrees CCW', 'click': () => { sendToWindow(win, 'context-menu-command', 'transform-anti-clockwise-90'); } },
          { 'label': isZhCN() ? '水平旋转' : 'Flip horizontal', 'click': () => { sendToWindow(win, 'context-menu-command', 'transform-mirror-horizontal'); } },
        ]
      },
      { type: 'separator' },
      { label: isZhCN() ? '隐藏' : 'Hide', click: () => { sendToWindow(win, 'context-menu-command', 'hide'); } },
      { label: isZhCN() ? '编辑' : 'Edit', click: () => { sendToWindow(win, 'context-menu-command', 'edit'); } },
      { type: 'separator' },
      { label: isZhCN() ? '删除' : 'Remove', click: () => { sendToWindow(win, 'context-menu-command', 'remove'); } },
    ];
    const menu = Menu.buildFromTemplate(template);
    if (isWindowAlive(win)) {
      menu.popup({ window: win });
    }
  },
  'setIgnoreMouseEvents': (payload, from) => {
    const { ignore, options } = payload || {};
    const win = windowMap[from];
    if (isWindowAlive(win)) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  },
  'appQuitConfirmed': (_payload, _from) => {
    handleQuitConfirmed();
  },
  'appQuitCancel': (_payload, _from) => {
    handleQuitCancel();
  },
  'hideChildPanel': (_payload, _from) => {
    if (isWindowAlive(windowMap.child)) {
      if (windowMap.child.isVisible() && _payload && _payload.panelType === lastChildWindowCommand) {
        lastChildWindowCommand = '';
        windowMap.child.hide();
      }
    }
  }
};

// 开启crash捕获
crashReporter.start({
  productName: 'tui-live-studio',
  companyName: 'Tencent Cloud',
  submitURL: 'https://www.xxx.com',
  uploadToServer: false,
  ignoreSystemCrashHandler: false,
});

// 开启crash捕获
let crashFilePath = '';
let crashDumpsDir = '';
try {
  // electron 低版本
  crashFilePath = path.join(app.getPath('temp'), app.getName() + ' Crashes');
  console.log('------ crash path:', crashFilePath);

  // electron 高版本
  crashDumpsDir = app.getPath('crashDumps');
  console.log('------ crashDumpsDir:', crashDumpsDir);
} catch (e) {
  console.error('Get crash dump folder failed', e);
}

async function checkAndApplyDeviceAccessPrivilege() {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    try {
      const cameraPrivilege = systemPreferences.getMediaAccessStatus('camera');
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply cameraPrivilege: ${cameraPrivilege}`
      );
      if (cameraPrivilege !== 'granted') {
        await systemPreferences.askForMediaAccess('camera');
      }

      const micPrivilege = systemPreferences.getMediaAccessStatus('microphone');
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply micPrivilege: ${micPrivilege}`
      );
      if (micPrivilege !== 'granted') {
        await systemPreferences.askForMediaAccess('microphone');
      }

      const screenPrivilege = systemPreferences.getMediaAccessStatus('screen');
      console.log(
        `checkAndApplyDeviceAccessPrivilege before apply screenPrivilege: ${screenPrivilege}`
      );
    } catch(err) {
      console.warn('checkAndApplyDeviceAccessPrivilege error:', err)
    }
  } else {
    // Electron API getMediaAccessStatus/askForMediaAccess does not support on Linux.
  }
}

function isZhCN() {
  return language === 'zh-CN';
}

function windowOpenHandler(details) {
  if (details.url) {
    if (details.url.startsWith('https:') || details.url.startsWith('http:')) {
      shell.openExternal(details.url);
    }
  }
  return { action: 'deny' };
}

async function createWindow(width = 1366, height = 668) {
  // IPC listener 必须在任何 BrowserWindow 构造之前注册！
  // BrowserWindow 构造时 preload 脚本立即执行，里面 sendSync('get-login-video-buffer')
  // 如果 listener 还没注册就会报 "without listeners"，同步 IPC 返回 undefined
  bindIPCEvent();

  await checkAndApplyDeviceAccessPrivilege();

  // 主窗口图标：用 nativeImage 多尺寸 PNG 构建，避免 PowerShell 生成的 ICO 颜色丢失
  const { nativeImage: _ni } = require('electron');
  const _mainIcon = _ni.createFromPath(path.join(__dirname, 'build', 'icon-round-32x32.png'));
  try { _mainIcon.addRepresentation({ scaleFactor: 2, file: path.join(__dirname, 'build', 'icon-round-48x48.png') }); } catch (_) {}
  try { _mainIcon.addRepresentation({ scaleFactor: 1, file: path.join(__dirname, 'build', 'icon-round-32x32.png') }); } catch (_) {}
  try { _mainIcon.addRepresentation({ scaleFactor: 0.5, file: path.join(__dirname, 'build', 'icon-round-16x16.png') }); } catch (_) {}

  windowMap.main = new BrowserWindow({
    width: 1620 || width,
    height: 1100 || height,
    minWidth: 1200,
    minHeight: 650,
    frame: false,
    acceptFirstMouse: true,
    icon: _mainIcon,
    // Electron 窗口底层背景。默认白色，会在 Vue 渲染出深色之前显示白屏。
    // 设成深色让窗口一出现就是黑底，配合登录页深色背景无缝衔接。
    backgroundColor: '#101013',
    // 先不显示，等页面（包括视频背景）完全加载好再显示。
    // 避免用户看到空壳窗口慢慢加载的过程。
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    },
  });
  windowMap.mainCover = new BrowserWindow({
    show: false,
    width: 10,
    height: 10,
    frame: false,
    transparent: true,
    resizable: false,
    acceptFirstMouse: true,
    parent: windowMap.main,
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    },
  });
  windowMap.child = new BrowserWindow({
    show: false,
    width: 600,
    height: 650,
    frame: false,
    acceptFirstMouse: true,
    skipTaskbar: true,
    resizable: false,
    parent: windowMap.main,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
    },
  });
  windowMap.confirm = new BrowserWindow({
    show: false,
    width: 480,
    // Match TUILiveKitMac exitLiveDialog size (TUIDialog default width 480, height is content-adaptive).
    // Use a taller fixed height here to fit header/content/footer in confirm BrowserWindow.
    height: 220,
    frame: false,
    transparent: false,
    resizable: false,
    parent: windowMap.main,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
    },
  });
  // 透明礼物覆盖窗口：覆盖在视频预览区域之上，只负责播放礼物特效
  windowMap.giftOverlay = new BrowserWindow({
    show: false,
    width: 10,
    height: 10,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    acceptFirstMouse: true,
    parent: windowMap.main,
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
      // 覆盖窗口从不获得焦点，关闭后台节流，保证礼物动画流畅
      backgroundThrottling: false,
      // 标记窗口角色，preload 解析后暴露 window.__WINDOW_ROLE__，
      // 让 Loading 启动页识别覆盖窗口、跳过登录跳转竞争（直接落 /gift-overlay 路由）
      additionalArguments: ['--window-role=gift-overlay'],
    },
  });
  windowMap.giftOverlay.setIgnoreMouseEvents(true);

  // Make all links open with the browser, not with current application
  windowMap.main.webContents.setWindowOpenHandler(windowOpenHandler);
  windowMap.child.webContents.setWindowOpenHandler(windowOpenHandler);
  windowMap.mainCover.webContents.setWindowOpenHandler(windowOpenHandler);
  windowMap.confirm.webContents.setWindowOpenHandler(windowOpenHandler);
  windowMap.giftOverlay.webContents.setWindowOpenHandler(windowOpenHandler);

  // 开发环境快捷键：F12/Ctrl+Shift+I 打开 DevTools，F5/Ctrl+R 刷新，Ctrl+Shift+D 切换 DevTools 停靠位置
  let devToolsMode = 'right'; // right | bottom | detach
  const toggleDevTools = (contents) => {
    if (contents.isDevToolsOpened()) {
      contents.closeDevTools();
    } else {
      contents.openDevTools({ mode: devToolsMode });
    }
  };
  const cycleDevToolsMode = () => {
    devToolsMode = devToolsMode === 'right' ? 'bottom' : devToolsMode === 'bottom' ? 'detach' : 'right';
  };
  const devToolsHandler = (event, input) => {
    if (input.type !== 'keyDown') return;
    const isF12 = input.key === 'F12';
    const isCtrlShiftI = input.control && input.shift && (input.key === 'I' || input.key === 'i');
    const isF5 = input.key === 'F5';
    const isCtrlR = input.control && (input.key === 'R' || input.key === 'r');
    const isCtrlShiftD = input.control && input.shift && (input.key === 'D' || input.key === 'd');
    if (isF12 || isCtrlShiftI) {
      event.preventDefault();
      const focused = BrowserWindow.getFocusedWindow();
      if (focused && focused.webContents) {
        toggleDevTools(focused.webContents);
      }
    } else if (isF5 || isCtrlR) {
      event.preventDefault();
      const focused = BrowserWindow.getFocusedWindow();
      if (focused && focused.webContents) {
        focused.webContents.reload();
      }
    } else if (isCtrlShiftD) {
      event.preventDefault();
      cycleDevToolsMode();
      const focused = BrowserWindow.getFocusedWindow();
      if (focused && focused.webContents && focused.webContents.isDevToolsOpened()) {
        focused.webContents.closeDevTools();
        focused.webContents.openDevTools({ mode: devToolsMode });
      }
    }
  };
  windowMap.main.webContents.on('before-input-event', devToolsHandler);
  windowMap.child.webContents.on('before-input-event', devToolsHandler);
  windowMap.mainCover.webContents.on('before-input-event', devToolsHandler);
  windowMap.confirm.webContents.on('before-input-event', devToolsHandler);

  // bindIPCEvent() 已移到 createWindow 开头，确保在 BrowserWindow 构造前注册
  bindMainWindowEvent();
  bindChildWindowEvent();
  bindCoverWindowEvent();
  bindConfirmWindowEvent();
  createTray();

  // --dist 参数（npm run start:fast）跳过 dev server，直接加载已构建的 dist-dev，
  // 避免每次启动都等 webpack 编译；代码有改动时先执行 npm run build:dev
  const fs = require('fs');
  const useDistArg = process.argv.includes('--dist');
  let useDistBundle = app.isPackaged || useDistArg;
  let bundleDir = useDistArg ? 'dist-dev' : 'dist';

  // 开发环境下如果指定了 --dist 但目录不存在，自动 fallback 到 dev server
  if (!app.isPackaged && useDistBundle) {
    const indexPath = path.join(__dirname, bundleDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.warn(`${logPrefix} ${bundleDir}/index.html not found, falling back to dev server. Run "npm run build:dev" first if you want to use --dist.`);
      useDistBundle = false;
    }
  }

  if (useDistBundle) {
    const indexPath = path.join(__dirname, bundleDir, 'index.html');
    console.log(`${logPrefix} loading file: ${indexPath}`);
    windowMap.main.loadFile(indexPath);
    windowMap.child.loadFile(indexPath);
    windowMap.mainCover.loadFile(indexPath);
    windowMap.confirm.loadFile(indexPath);
    // 与其他窗口保持一致的加载模式：先 loadFile，再由 did-finish-load 钩子设置 hash 路由。
    // loadFile 的 hash 选项在该版本 Electron 上未可靠生效，曾导致覆盖窗口停在 Loading 页、礼物无法展示
    windowMap.giftOverlay.loadFile(indexPath);
  } else {
    console.log(`${logPrefix} loading dev server: http://localhost:8080`);
    windowMap.main.loadURL('http://localhost:8080');
    windowMap.child.loadURL('http://localhost:8080/#/tui-live-kit-child');
    windowMap.mainCover.loadURL('http://localhost:8080/#/tui-live-kit-cover');
    windowMap.confirm.loadURL('http://localhost:8080/#/tui-live-kit-confirm');
    windowMap.giftOverlay.loadURL('http://localhost:8080/#/gift-overlay');
  }
  // 覆盖窗口路由定位（与 child/cover/confirm 的 executeJavaScript 方式一致，已验证可靠）
  windowMap.giftOverlay.webContents.on('did-finish-load', () => {
    if (isWindowAlive(windowMap.giftOverlay)
      && !windowMap.giftOverlay.webContents.getURL().includes('/gift-overlay')) {
      windowMap.giftOverlay.webContents.executeJavaScript('window.location.hash = \'/gift-overlay\';');
    }
  });
  windowMap.giftOverlay.webContents.on('did-fail-load', (_event, code, desc) => {
    console.error('[giftOverlay] did-fail-load:', code, desc);
  });
}

// ==================== 登录页视频预缓存 ====================
// Chromium 在 file:// 协议下 preload="auto" 会退化成 preload="metadata"（只加载首帧），
// 导致 2.4MB mp4 视频登录页出现要等数秒。
// 解决：主进程启动时同步把 mp4 读到内存，渲染进程 IPC 拿 Buffer 生成 Blob URL，
// 这样 video.src 赋值时零 I/O、零磁盘等待。
let cachedLoginVideoBuffer = null;

/** 在 webpack 产出的 media 目录里扫描 niko-live-video.*.mp4（content hash 不固定） */
function findLoginVideoInDir(dirPath) {
  try {
    const fs = require('fs');
    if (!fs.existsSync(dirPath)) return null;
    const entries = fs.readdirSync(dirPath);
    const match = entries.find((f) => /^niko-live-video.*\.mp4$/.test(f));
    if (!match) return null;
    const fullPath = path.join(dirPath, match);
    return fs.readFileSync(fullPath);
  } catch (_e) {
    return null;
  }
}

function preloadLoginVideo() {
  try {
    // webpack 产出在 dist-dev/media/ 或 dist/media/，文件名带 content hash：
    // 开发时 __dirname 就是项目根；打包后 app.getAppPath() 指向 asar 根
    const mediaDirs = [
      path.join(__dirname, 'dist-dev', 'media'),
      path.join(__dirname, 'dist', 'media'),
      path.join(app.getAppPath(), 'dist', 'media'),
    ];
    for (const dir of mediaDirs) {
      const buf = findLoginVideoInDir(dir);
      if (buf) {
        cachedLoginVideoBuffer = buf;
        console.log(`${logPrefix} preloaded login video: ${buf.length} bytes (${(buf.length / 1024 / 1024).toFixed(2)} MB) from ${dir}`);
        return;
      }
    }
    console.warn(`${logPrefix} login video not found in any media dir, skip preload. dirs:`, mediaDirs);
  } catch (e) {
    console.warn(`${logPrefix} preloadLoginVideo failed:`, e && e.message);
  }
}

function bindIPCEvent() {
  ipcMain.handle('app-path', () => {
    return app.getAppPath();
  });
  ipcMain.handle('get-language', () => {
    return language;
  });

  // 渲染进程请求登录页视频 Buffer（主进程启动时已同步读入内存）
  ipcMain.handle('get-login-video-buffer', () => {
    return cachedLoginVideoBuffer;
  });

  // 礼物特效配置（VAP JSON）由主进程转发，规避资源域无 CORS 头导致渲染进程 fetch 失败
  ipcMain.handle('fetch-gift-config', (_event, url) => new Promise((resolve, reject) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      reject(new Error('invalid url'));
      return;
    }
    const request = net.request({ url, method: 'GET' });
    let body = '';
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk) => {
        body += chunk.toString();
      });
      response.on('end', () => resolve(body));
    });
    request.on('error', reject);
    request.end();
  }));

  ipcMain.handle('window-type', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      return 'main';
    } else if (event.sender === windowMap.child?.webContents) {
      return 'child';
    } else if (event.sender === windowMap.mainCover?.webContents) {
      return 'cover'
    } else if (event.sender === windowMap.confirm?.webContents) {
      return 'confirm';
    } else {
      return '';
    }
  });

  ipcMain.handle('window-id', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      return  windowMap.main.getNativeWindowHandle();
    } else if (event.sender === windowMap.child?.webContents) {
      return  windowMap.child.getNativeWindowHandle();
    } else if (event.sender === windowMap.mainCover?.webContents) {
      return  windowMap.mainCover.getNativeWindowHandle();
    } else if (event.sender === windowMap.confirm?.webContents) {
      return  windowMap.confirm.getNativeWindowHandle();
    } else {
      return 0;
    }
  });

  // ============== New IPC Message Router for V2 ==============
  // Unified message routing for inter-window communication
  // This replaces MessageChannel mechanism with IPC-based communication
  ipcMain.on('window-message', (event, message) => {
    const { type, payload, to } = message;

    // Determine the source window
    let from = 'unknown';
    if (event.sender === windowMap.main?.webContents) {
      from = 'main';
    } else if (event.sender === windowMap.child?.webContents) {
      from = 'child';
    } else if (event.sender === windowMap.mainCover?.webContents) {
      from = 'cover';
    } else if (event.sender === windowMap.confirm?.webContents) {
      from = 'confirm';
    }

    const messageWithFrom = { ...message, from };
    console.log(`${logPrefix}window-message: type=${type}, from=${from}, to=${to}`);

    // Handle messages targeting Electron main process itself (not forwarded to any renderer)
    if (to === 'electron-main') {
      const handler = mainProcessHandlers[type];
      if (handler) {
        handler(payload, from);
      } else {
        console.warn(`${logPrefix}window-message: no handler for electron-main action: ${type}`);
      }
      return;
    }

    // Route message based on target
    if (to === 'broadcast') {
      // Broadcast to all other windows
      if (from !== 'main') {
        sendToWindow(windowMap.main, 'window-message', messageWithFrom);
      }
      if (from !== 'child') {
        sendToWindow(windowMap.child, 'window-message', messageWithFrom);
      }
      if (from !== 'cover') {
        sendToWindow(windowMap.mainCover, 'window-message', messageWithFrom);
      }
      if (from !== 'confirm') {
        sendToWindow(windowMap.confirm, 'window-message', messageWithFrom);
      }
    } else if (to === 'main') {
      sendToWindow(windowMap.main, 'window-message', messageWithFrom);
    } else if (to === 'child') {
      if (type === 'showChildPanel') {
        // SHOW_CHILD_PANEL: control window size/position + show, then forward message
        const { panelType, windowSize } = message.payload || {};
        const size = windowSize || getDefaultPanelSize(panelType);
        if (isWindowAlive(windowMap.child)) {
          windowMap.child.setSize(size.width, size.height, true);
          windowMap.child.setContentSize(size.width, size.height, true);
          windowMap.child.center();
          windowMap.child.show();
        }
        lastChildWindowCommand = panelType || '';
      }
      // For UPDATE_CHILD_DATA and all other types: just forward, no window manipulation
      sendToWindow(windowMap.child, 'window-message', messageWithFrom);
    } else if (to === 'cover') {
      sendToWindow(windowMap.mainCover, 'window-message', messageWithFrom);
    } else if (to === 'confirm') {
      if (type === 'showConfirmDialog') {
        if (isWindowAlive(windowMap.confirm)) {
          windowMap.confirm.center();
        }
      }
      sendToWindow(windowMap.confirm, 'window-message', messageWithFrom);
      if (type === 'showConfirmDialog') {
        // Confirm dialog is now visible and the user can interact with it.
        // Clear the force-quit timeout so the user has unlimited time to decide.
        clearQuitTimers();
        // On macOS the confirm window is a document-modal sheet attached to
        // the main window. Its z-order relative to the camera/setting child
        // BrowserWindow (also a child of main) is ambiguous, so the child can
        // occlude the confirm sheet. Hide the child here as a safety net so
        // the confirmation is always visible. Windows keeps the child intact
        // because its centered modal confirm window already sits on top.
        if (process.platform === 'darwin' && isWindowAlive(windowMap.child) && windowMap.child.isVisible()) {
          windowMap.child.hide();
        }
        if (isWindowAlive(windowMap.confirm)) {
          windowMap.confirm.show();
        }
      } else if (type === 'closeConfirmDialog') {
        if (isWindowAlive(windowMap.confirm)) {
          windowMap.confirm.hide();
        }
      }
    } else {
      console.warn(`${logPrefix}window-message: unknown target: ${to}`);
    }
  });
  // ============== End of New IPC Message Router ==============

  // 窗口工具按钮：按事件来源窗口处理，避免页面在子窗口/重建窗口里时操作到错误窗口
  ipcMain.on('on-minimize-window', (evt) => {
    console.log(`${logPrefix}on-minimize-window event`);
    const target = BrowserWindow.fromWebContents(evt.sender);
    if (target && !target.isDestroyed()) {
      target.minimize();
    }
  });

  ipcMain.on('on-maximize-window', (evt, flag) => {
    console.log(`${logPrefix}on-maximize-window event:`, flag);
    const target = BrowserWindow.fromWebContents(evt.sender);
    if (target && !target.isDestroyed()) {
      if (flag) {
        target.maximize();
      } else {
        target.unmaximize();
      }
    }
  });

  ipcMain.on('on-close-window', (evt) => {
    console.log(`${logPrefix}on-close-window event`);
    // Delegate close behavior to the main window 'close' handler so that
    // the renderer can decide whether the application should actually quit.
    const target = BrowserWindow.fromWebContents(evt.sender);
    if (target && !target.isDestroyed()) {
      target.close();
    }
  });

  // 主播中心 / 主播中心子页使用的窗口控制通道（window-minimize 等）。
  // 之前只注册了 on-*-window，导致这些页面的最小化/最大化/关闭按钮点了没反应。
  ipcMain.on('window-minimize', (evt) => {
    const target = BrowserWindow.fromWebContents(evt.sender);
    if (target && !target.isDestroyed()) {
      target.minimize();
    }
  });

  ipcMain.on('window-toggle-maximize', (evt) => {
    const target = BrowserWindow.fromWebContents(evt.sender);
    if (target && !target.isDestroyed()) {
      if (target.isMaximized()) {
        target.unmaximize();
      } else {
        target.maximize();
      }
    }
  });

  ipcMain.on('window-close', (evt) => {
    const target = BrowserWindow.fromWebContents(evt.sender);
    if (target && !target.isDestroyed()) {
      target.close();
    }
  });

  // 先移除旧的 handle，避免窗口重建时重复注册报错
  ipcMain.removeHandler('window-is-maximized');
  ipcMain.handle('window-is-maximized', (evt) => {
    const target = BrowserWindow.fromWebContents(evt.sender);
    return target && !target.isDestroyed() ? target.isMaximized() : false;
  });

  // 最小化到系统托盘（不退出）
  ipcMain.on('minimize-to-tray', () => {
    console.log(`${logPrefix}minimize-to-tray event`);
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.hide();
    }
  });

  ipcMain.on('open-child', (event, args) => {
    console.log(`${logPrefix}on open-child`, args);
    if(lastChildWindowCommand === args.command) {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.show();
      }
      return;
    }
    lastChildWindowCommand = args.command;
    const [width, height] = isWindowAlive(windowMap.main)
      ? windowMap.main.getSize()
      : [1200, 800];
    switch (args.command) {
    case 'camera':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 400, true);
        windowMap.child.setContentSize(600, 400, true);
      }
      break;
    case 'user-profile':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 460, true);
        windowMap.child.setContentSize(600, 460, true);
      }
      break;
    case 'image':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 500, true);
        windowMap.child.setContentSize(600, 500, true);
      }
      break;
    case 'screen':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(width - 150, height - 80, true);
        windowMap.child.setContentSize(width -150, height - 80, true);
      }
      break;
    case 'rename':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(480, 176, true);
        windowMap.child.setContentSize(480, 176, true);
      }
      break;
    case 'co-guest-connection':
    case 'co-host-connection':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(520, 560, true);
        windowMap.child.setContentSize(520, 560, true);
      }
      break;
    case 'add-bgm':
    case 'reverb-voice':
    case 'change-voice':
    case 'setting':
    case 'phone-mirror':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 560, true);
        windowMap.child.setContentSize(600, 560, true);
      }
      break;
    case 'online-video':
    case 'video-file':
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.setSize(600, 360, true);
        windowMap.child.setContentSize(600, 360, true);
      }
      break;
    default:
      break;
    }
    if (isWindowAlive(windowMap.child)) {
      windowMap.child.center();
      windowMap.child.show();
    }
    sendToWindow(windowMap.child, 'show', args);
  });

  ipcMain.on('close-child', () => {
    lastChildWindowCommand = '';
    if (isWindowAlive(windowMap.child)) {
      windowMap.child.hide();
    }
  });

  ipcMain.on('user-login', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      sendToWindow(windowMap.child, 'user-login', { from: 'main', to: 'child' });
      sendToWindow(windowMap.mainCover, 'user-login', { from: 'main', to: 'cover' });
      sendToWindow(windowMap.confirm, 'user-login', { from: 'main', to: 'confirm' });
    } else if (event.sender === windowMap.child?.webContents) {
      sendToWindow(windowMap.main, 'user-login', { from: 'child', to: 'main' });
      sendToWindow(windowMap.mainCover, 'user-login', { from: 'child', to: 'cover' });
      sendToWindow(windowMap.confirm, 'user-login', { from: 'child', to: 'confirm' });
    } else if (event.sender === windowMap.mainCover?.webContents)  {
      sendToWindow(windowMap.main, 'user-login', { from: 'cover', to: 'main' });
      sendToWindow(windowMap.child, 'user-login', { from: 'cover', to: 'child' });
      sendToWindow(windowMap.confirm, 'user-login', { from: 'cover', to: 'confirm' });
    } else if (event.sender === windowMap.confirm?.webContents)  {
      sendToWindow(windowMap.main, 'user-login', { from: 'confirm', to: 'main' });
      sendToWindow(windowMap.child, 'user-login', { from: 'confirm', to: 'child' });
      sendToWindow(windowMap.mainCover, 'user-login', { from: 'confirm', to: 'cover' });
    } else {
      console.warn(`${logPrefix} unkonwn event source:`, event);
    }
  });

  ipcMain.on('user-logout', (event) => {
    if (event.sender === windowMap.main?.webContents) {
      sendToWindow(windowMap.child, 'user-logout', { from: 'main' });
    } else {
      sendToWindow(windowMap.main, 'user-logout', { from: 'child' });
    }
    // Clear the last panel command so the next open after re-login always
    // re-centers / re-sizes the child window instead of short-circuiting to a
    // bare show() (see the open-child handler's `lastChildWindowCommand` guard).
    lastChildWindowCommand = '';
    if (isWindowAlive(windowMap.child)) {
      windowMap.child.hide();
    }
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.hide();
    }
  });

  ipcMain.on('port-to-child', (event) => {
    const port = event.ports[0];
    console.log('port-to-child', port);
    postMessageToWindow(windowMap.child, 'port-to-child', null, [port]);
  });

  ipcMain.on('port-to-cover', (event) => {
    const port = event.ports[0];
    console.log('port-to-cover', port);
    postMessageToWindow(windowMap.mainCover, 'port-to-cover', null, [port]);
  });

  ipcMain.on('port-to-confirm', (event) => {
    const port = event.ports[0];
    console.log('port-to-confirm', port);
    postMessageToWindow(windowMap.confirm, 'port-to-confirm', null, [port]);
  });

  // Legacy 'set-language' channel removed — language updates now flow through
  // the V2 mainProcessHandlers['setLanguage'] via ipcBridge.sendToElectronMain().

  ipcMain.on('show-context-menu', (event) => {
    const template = [
      {
        label: isZhCN() ? '排序' : 'Sort',
        submenu: [
          { 'label': isZhCN() ? '上移' : 'Move up', 'click': () => { event.sender.send('context-menu-command', 'move-up'); } },
          { 'label': isZhCN() ? '下移' : 'Move down', 'click': () => { event.sender.send('context-menu-command', 'move-down'); } },
          { 'label': isZhCN() ? '移至顶部' : 'Move to top', 'click': () => {  event.sender.send('context-menu-command', 'move-top'); } },
          { 'label': isZhCN() ? '移至底部' : 'Move to bottom', 'click': () => {  event.sender.send('context-menu-command', 'move-bottom'); }},
        ]
      },
      {
        label: isZhCN() ? '变换' : 'Transform',
        submenu: [
          { 'label': isZhCN() ? '顺时针旋转90度' : 'Rotate 90 degrees CW', 'click': () => { event.sender.send('context-menu-command', 'transform-clockwise-90'); } },
          { 'label': isZhCN() ? '逆时针旋转90度' : 'Rotate 90 degrees CCW', 'click': () => { event.sender.send('context-menu-command', 'transform-anti-clockwise-90'); } },
          { 'label': isZhCN() ? '水平旋转' : 'Flip horizontal', 'click': () => {  event.sender.send('context-menu-command', 'transform-mirror-horizontal'); } },
          // { "label": isZhCN() ? "垂直旋转" : "Flip vertical", "click": () => {  event.sender.send("context-menu-command", "transform-mirror-vertical"); }},
          // { type: "separator" },
          // { "label": "还原", "click": () => {  event.sender.send("context-menu-command", "transform-reset"); }},
        ]
      },
      { type: 'separator' },
      { label: isZhCN() ? '隐藏' : 'Hide', click: () => {  event.sender.send('context-menu-command', 'hide'); } },
      // { label: "锁定", click: () => {  event.sender.send("context-menu-command", "lock"); } },
      { label: isZhCN() ? '编辑' : 'Edit', click: () => {  event.sender.send('context-menu-command', 'edit'); } },
      { type: 'separator' },
      { label: isZhCN() ? '删除' : 'Remove', click: () => {  event.sender.send('context-menu-command', 'remove'); } },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
  });

  ipcMain.on('start-use-driver-installer', (event, args) => {
    console.log(`${logPrefix}start-use-driver-installer:${args}`);
    let command = '';
    if (app.isPackaged) {
      command = path.join(process.execPath, '../usbscreendriver.exe');
    } else {
      command = path.join(app.getAppPath(), '/node_modules/electron/dist/usbscreendriver.exe');
    }
    command = '"' + command + '"' + ` --mode=${args}`;
    console.warn(`${logPrefix}start-use-driver-installer command:`, command);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(`Output: ${stdout}`);
    });
  });

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    console.log(`${logPrefix}set-ignore-mouse-events`, ignore, options);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (isWindowAlive(win)) {
      win.setIgnoreMouseEvents(ignore, options); // windowMap.mainCover
    }
  });

  ipcMain.on('stream-layout-area', (event, args) => {
    console.log('stream-layout-area', args);
    const { top, left, width, height } = args;
    coverWindowRelativeBounds.x = Math.round(left);
    coverWindowRelativeBounds.y = Math.round(top);
    coverWindowRelativeBounds.width = Math.round(width);
    coverWindowRelativeBounds.height = Math.round(height);

    if (isWindowAlive(windowMap.main)) {
      const mainBounds = windowMap.main.getContentBounds();
      console.log('stream-layout-area main window mainBounds', mainBounds, windowMap.main.getBounds());
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.setBounds({
          x: coverWindowRelativeBounds.x + mainBounds.x,
          y: coverWindowRelativeBounds.y + mainBounds.y,
          width: coverWindowRelativeBounds.width,
          height: coverWindowRelativeBounds.height,
        });
      }
      // 礼物覆盖窗口跟随视频区域实时移动（最大化/布局变化时保持压住视频）
      if (isWindowAlive(windowMap.giftOverlay) && windowMap.giftOverlay.isVisible() && !overlayUserCardVisible) {
        giftOverlayRelativeBounds.x = coverWindowRelativeBounds.x;
        giftOverlayRelativeBounds.y = coverWindowRelativeBounds.y;
        giftOverlayRelativeBounds.width = coverWindowRelativeBounds.width;
        giftOverlayRelativeBounds.height = coverWindowRelativeBounds.height;
        windowMap.giftOverlay.setBounds({
          x: coverWindowRelativeBounds.x + mainBounds.x,
          y: coverWindowRelativeBounds.y + mainBounds.y,
          width: coverWindowRelativeBounds.width,
          height: coverWindowRelativeBounds.height,
        });
      }
    }
    console.log('stream-layout-area finished');
  });

  // ===== 礼物覆盖窗口：原生视频永远在 DOM 之上，礼物特效改在透明覆盖窗口播放 =====
  ipcMain.on('gift-overlay-play', (event, payload) => {
    const gift = payload?.gift;
    if (!gift || !isWindowAlive(windowMap.giftOverlay) || !isWindowAlive(windowMap.main)) {
      return;
    }
    // 优先用渲染进程本次量取的视频区坐标（CSS px，与窗口内容区同源）；
    // stream-layout-area 维护的坐标来自 SDK 且按 devicePixelRatio 换算，
    // 高分屏下与 CSS px 不一致，仅在没有 payload.bounds 时兜底
    let rel = null;
    if (payload?.bounds && payload.bounds.width > 0 && payload.bounds.height > 0) {
      rel = {
        x: Math.round(payload.bounds.left || 0),
        y: Math.round(payload.bounds.top || 0),
        width: Math.max(1, Math.round(payload.bounds.width || 0)),
        height: Math.max(1, Math.round(payload.bounds.height || 0)),
      };
    } else if (coverWindowRelativeBounds.width > 0 && coverWindowRelativeBounds.height > 0) {
      rel = {
        x: coverWindowRelativeBounds.x,
        y: coverWindowRelativeBounds.y,
        width: coverWindowRelativeBounds.width,
        height: coverWindowRelativeBounds.height,
      };
    }
    if (!rel || !rel.width || !rel.height) {
      return;
    }
    giftOverlayRelativeBounds.x = rel.x;
    giftOverlayRelativeBounds.y = rel.y;
    giftOverlayRelativeBounds.width = rel.width;
    giftOverlayRelativeBounds.height = rel.height;

    // 用户卡片展示期间窗口已扩展到全窗口尺寸，礼物仅播放内容、不再重定位窗口
    if (!overlayUserCardVisible) {
      const mainBounds = windowMap.main.getContentBounds();
      windowMap.giftOverlay.setBounds({
        x: rel.x + mainBounds.x,
        y: rel.y + mainBounds.y,
        width: rel.width,
        height: rel.height,
      });
    }
    // 原生视频窗口由 TRTC SDK 独立创建，普通 show 不一定能压住它：
    // 置顶级别用 Windows 最高的 screen-saver，再 moveTop 确保盖在原生视频上方
    windowMap.giftOverlay.setAlwaysOnTop(true, 'screen-saver');
    windowMap.giftOverlay.show();
    windowMap.giftOverlay.moveTop();
    console.log('[giftOverlay] play gift:', gift?.giftName || gift?.giftId,
      'bounds:', JSON.stringify(rel), 'visible:', windowMap.giftOverlay.isVisible(),
      'url:', windowMap.giftOverlay.webContents?.getURL?.());
    sendToWindow(windowMap.giftOverlay, 'gift-overlay-gift', { gift });
  });

  ipcMain.on('gift-overlay-hide', () => {
    if (isWindowAlive(windowMap.giftOverlay)) {
      overlayUserCardVisible = false;
      windowMap.giftOverlay.setIgnoreMouseEvents(true);
      windowMap.giftOverlay.setAlwaysOnTop(false);
      windowMap.giftOverlay.hide();
    }
  });

  // ===== 用户信息卡片：DOM 卡片会被原生视频窗口压住，改在透明覆盖窗口中展示 =====
  ipcMain.on('user-card-show', (event, payload) => {
    if (!isWindowAlive(windowMap.giftOverlay) || !isWindowAlive(windowMap.main)) {
      return;
    }
    overlayUserCardVisible = true;
    // 卡片期间窗口扩展到主窗口整个内容区（卡片居中展示、遮罩可点击关闭）
    const mainBounds = windowMap.main.getContentBounds();
    windowMap.giftOverlay.setBounds({
      x: mainBounds.x,
      y: mainBounds.y,
      width: mainBounds.width,
      height: mainBounds.height,
    });
    windowMap.giftOverlay.setAlwaysOnTop(true, 'screen-saver');
    // 关闭鼠标穿透，让卡片上的关闭按钮/遮罩可以点击
    windowMap.giftOverlay.setIgnoreMouseEvents(false);
    windowMap.giftOverlay.show();
    windowMap.giftOverlay.moveTop();
    console.log('[giftOverlay] show user card, visible:', windowMap.giftOverlay.isVisible(),
      'url:', windowMap.giftOverlay.webContents?.getURL?.());
    sendToWindow(windowMap.giftOverlay, 'user-card-show', payload || {});
  });

  ipcMain.on('user-card-hide', () => {
    if (!isWindowAlive(windowMap.giftOverlay)) {
      return;
    }
    overlayUserCardVisible = false;
    windowMap.giftOverlay.setIgnoreMouseEvents(true);
    // 恢复为视频区域尺寸，后续礼物继续在该区域播放
    const mainBounds = isWindowAlive(windowMap.main) ? windowMap.main.getContentBounds() : null;
    if (mainBounds && giftOverlayRelativeBounds.width > 0 && giftOverlayRelativeBounds.height > 0) {
      windowMap.giftOverlay.setBounds({
        x: giftOverlayRelativeBounds.x + mainBounds.x,
        y: giftOverlayRelativeBounds.y + mainBounds.y,
        width: giftOverlayRelativeBounds.width,
        height: giftOverlayRelativeBounds.height,
      });
    } else {
      windowMap.giftOverlay.setAlwaysOnTop(false);
      windowMap.giftOverlay.hide();
    }
  });

  ipcMain.on('stream-layout', (event, args) => {
    console.log('stream-layout', args);
    if (args?.layoutMode === 'Custom') {
      if (isWindowAlive(windowMap.main) && isWindowAlive(windowMap.mainCover)
        && windowMap.main.isVisible() && !windowMap.main.isMinimized() && !windowMap.mainCover.isVisible()) {
        windowMap.mainCover.show();
        if (lastChildWindowCommand === 'co-guest-connection' || lastChildWindowCommand === 'co-host-connection') {
          if (isWindowAlive(windowMap.child)) {
            windowMap.child.show();
          }
        }
      }
    } else {
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.hide();
      }
    }
  });

  ipcMain.on('stop-living', (event, args) => {
    sendToWindow(windowMap.confirm, 'stop-living', args);
    if (isWindowAlive(windowMap.confirm)) {
      windowMap.confirm.show();
    }
  });
  ipcMain.on('stop-living-result', (event, args) => {
    if (isWindowAlive(windowMap.confirm)) {
      windowMap.confirm.hide();
    }
    sendToWindow(windowMap.main, 'stop-living-result', args);
  });

  ipcMain.on('app-quit-confirmed', () => {
    console.log(`${logPrefix}app-quit-confirmed`);
    handleQuitConfirmed();
  });

  ipcMain.on('app-quit-cancel', () => {
    console.log(`${logPrefix}app-quit-cancel`);
    handleQuitCancel();
  });

  // Mac path: TUIMessageBox is rendered inside the main window and does NOT
  // go through the 'window-message' → 'showConfirmDialog' route used by the
  // Win confirm BrowserWindow. This handshake mirrors the same intent for
  // the Mac path: as soon as the confirm dialog is visible to the user,
  // clear the force-quit timeout so the user has unlimited time to decide.
  // Without this, Mac users who do not respond within QUIT_TIMEOUT_MS see
  // the app force-quit while the confirmation dialog is still showing.
  ipcMain.on('app-quit-confirm-shown', () => {
    console.log(`${logPrefix}app-quit-confirm-shown`);
    clearQuitTimers();
  });

  // Confirm window ready handshake - called when confirm window's Vue component is mounted
  ipcMain.on('confirm-window-ready', () => {
    console.log(`${logPrefix}confirm-window-ready`);
    isConfirmWindowReady = true;

    // If there's a pending quit request, send it now
    if (pendingQuitRequest) {
      console.log(`${logPrefix}confirm-window-ready: sending pending quit request`);
      sendQuitRequestToRenderer();
      pendingQuitRequest = false;
      if (quitRetryTimer) {
        clearInterval(quitRetryTimer);
        quitRetryTimer = null;
      }
    }
  });

  // ============== 系统状态：电池电量 + WiFi ==============
  // 通过 ipcRenderer.invoke('get-battery-info') / invoke('get-wifi-info') 轮询获取
  ipcMain.handle('get-battery-info', () => {
    const defaultInfo = { hasBattery: false, level: 100, charging: false };
    if (process.platform !== 'win32') {
      return defaultInfo;
    }
    try {
      const out = execSync('wmic path Win32_Battery get EstimatedChargeRemaining,BatteryStatus /value', {
        encoding: 'utf8',
        timeout: 3000,
      }).toString();
      const levelMatch = out.match(/EstimatedChargeRemaining=(\d+)/);
      const statusMatch = out.match(/BatteryStatus=(\d+)/);
      if (!levelMatch) {
        return defaultInfo;
      }
      const level = Math.max(0, Math.min(100, parseInt(levelMatch[1], 10)));
      // BatteryStatus: 2=on AC/charging, 1=discharging, others (3..7) also charging-related
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
      const charging = status === 2 || status === 6 || status === 7 || status === 8 || status === 9;
      return { hasBattery: true, level, charging };
    } catch (e) {
      console.warn(`${logPrefix}get-battery-info failed:`, e.message);
      return defaultInfo;
    }
  });

  ipcMain.handle('get-network-info', () => {
    const defaultInfo = { connected: false, type: '', ssid: '', signal: 0 };
    if (process.platform !== 'win32') {
      return defaultInfo;
    }
    try {
      // PowerShell EncodedCommand 检测 WiFi/以太网（避免 shell 引号嵌套问题）
      const psScript = [
        '$ProgressPreference = \'SilentlyContinue\'',
        '$adapters = Get-NetAdapter -Physical | Where-Object { $_.Status -eq \'Up\' }',
        'if (-not $adapters) { exit 0 }',
        '$wifi = $adapters | Where-Object { $_.InterfaceDescription -match \'Wi-Fi|WiFi|Wireless|802.11\' -or $_.InterfaceAlias -match \'WLAN|Wi-Fi\' } | Select-Object -First 1',
        'if ($wifi) {',
        '  $signal = 0',
        '  $ssid = \'\'',
        '  $wlan = netsh wlan show interfaces 2>$null',
        '  foreach ($line in $wlan) {',
        '    if ($line -match \'(?:Signal|信号)\\s*:\\s*(\\d+)%\') { $signal = [int]$Matches[1]; break }',
        '  }',
        '  foreach ($line in $wlan) {',
        '    if ($line -match \'(?:SSID)\\s*:\\s*(.+)\') { $ssid = $Matches[1].Trim(); break }',
        '  }',
        '  Write-Output (\'WIFI|\' + $ssid + \'|\' + $signal)',
        '} else {',
        '  Write-Output \'ETHERNET\'',
        '}',
      ].join('\n');
      // PowerShell EncodedCommand 检测 WiFi/以太网
      const psCmd = Buffer.from(psScript, 'utf16le').toString('base64');
      let psOut = execSync(
        `powershell -NoProfile -EncodedCommand ${psCmd}`,
        { encoding: 'utf8', timeout: 10000, windowsHide: true },
      ).toString();
      // PowerShell 有时混入 CLIXML 进度对象，只取第一个有效行
      const m = psOut.match(/(?:WIFI\|[^\n\r]*|ETHERNET)/);
      psOut = (m ? m[0] : psOut).trim();
      if (psOut.startsWith('WIFI|')) {
        const parts = psOut.split('|');
        return {
          connected: true,
          type: 'wifi',
          ssid: parts[1] || '',
          signal: parts[2] ? parseInt(parts[2], 10) : 0,
        };
      }
      if (psOut === 'ETHERNET') {
        return { connected: true, type: 'ethernet', ssid: '', signal: 0 };
      }
      console.warn('[TUILiveKit.main] get-network-info unexpected psOut:', psOut);
    } catch (e) {
      console.warn('[TUILiveKit.main] get-network-info failed:', e.message);
    }
    return defaultInfo;
  });
}

function unbindIPCMainEvent() {
  ipcMain.removeHandler('app-path');
  ipcMain.removeHandler('get-language');
  ipcMain.removeHandler('window-type');
  ipcMain.removeAllListeners('window-message'); // V2 IPC message router
  ipcMain.removeAllListeners('on-minimize-window');
  ipcMain.removeAllListeners('on-maximize-window');
  ipcMain.removeAllListeners('on-close-window');
  ipcMain.removeAllListeners('window-minimize');
  ipcMain.removeAllListeners('window-toggle-maximize');
  ipcMain.removeAllListeners('window-close');
  ipcMain.removeHandler('window-is-maximized');
  ipcMain.removeAllListeners('minimize-to-tray');
  ipcMain.removeAllListeners('open-child');
  ipcMain.removeAllListeners('close-child');
  ipcMain.removeAllListeners('login');
  ipcMain.removeAllListeners('port-to-child');
  ipcMain.removeAllListeners('show-context-menu');
  ipcMain.removeAllListeners('start-use-driver-installer');
  ipcMain.removeAllListeners('app-quit-confirmed');
  ipcMain.removeAllListeners('app-quit-cancel');
  ipcMain.removeAllListeners('confirm-window-ready');
  ipcMain.removeAllListeners('gift-overlay-play');
  ipcMain.removeAllListeners('gift-overlay-hide');
  ipcMain.removeHandler('get-battery-info');
  ipcMain.removeHandler('get-network-info');
}

let initMainWindowTimer = null;
function initMainWindowPage() {
  if (initMainWindowTimer) {
    clearTimeout(initMainWindowTimer);
    initMainWindowTimer = null;
  }
  console.log(`${logPrefix}main window: initMainWindowPage`);
  if (basicInfo.userInfo) {
    sendToWindow(windowMap.main, 'window-type', 'main');
    setTimeout(() => {
      sendToWindow(windowMap.main, 'openTUILiveKit', basicInfo.userInfo);
    }, 3000);
  } else {
    initMainWindowTimer = setTimeout(() => {
      initMainWindowPage();
    }, 300);
  }
}

// 系统托盘
let appTray = null;
// 软件内部页面窗口（家族入驻/公会入驻/组织管理/提现等 H5 业务页，不暴露 node 能力）
let internalPageWindow = null;
// 当前内部页 SSO 配置：{ token, origin }
// 与 H5 主项目 ssoBridge.ts 的协议对齐：子应用加载后通过 message 事件接收 SSO_TOKEN，
// 同时把 token 写入 niko-auth storage，让子应用无论用哪种方式都能拿到登录态。
let internalPageSso = null;
// 创建窗口时传给 preload 的 SSO 参数指纹，登录态/组织变化时需要重建窗口
let internalPageSsoKey = null;
// 模拟 Chrome 最新版 UA（Electron 默认 UA 带 "Electron/" 字样，部分 H5 站点检测后返回空壳）
const CHROME_LIKE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * 把当前 SSO 配置注入到 internalPageWindow 加载的页面。
 *
 * 三个内嵌 H5 项目读取 token 的方式各不相同（都已在 H5 侧固定，桌面端不改它们）：
 *   - h5-tixian（/withdraw）：sessionStorage['token']
 *   - h5-organization（/organization）：localStorage['token'] + sessionStorage['organizationInfoObj']
 *   - h5-organization-settled（/organization-settled）：localStorage['guild_token']，兜底 sessionStorage['niko-auth']
 *   - 以及 H5 主项目约定的 sessionStorage/localStorage['niko-auth']（JSON: { token }）
 * 另外兼容 postMessage 握手（data.type === 'SSO_TOKEN'）。
 *
 * 由于这些 key 需要在页面脚本启动前就位，注入后若发现是本窗口第一次拿到该 token，
 * 会 reload 一次（reload 后标记命中就不会再 reload，不会循环）。
 */
function injectSsoToInternalPage() {
  if (!internalPageWindow || internalPageWindow.isDestroyed()) {
    return;
  }
  if (!internalPageSso || !internalPageSso.token) {
    return;
  }
  const token = String(internalPageSso.token);
  const origin = String(internalPageSso.origin || '');
  const rawOrgId = internalPageSso.organizationId;
  const orgIdLiteral = rawOrgId !== undefined && rawOrgId !== null && Number.isFinite(Number(rawOrgId))
    ? String(Number(rawOrgId))
    : 'null';
  const script = `
    (function () {
      try {
        var token = ${JSON.stringify(token)};
        var origin = ${JSON.stringify(origin)};
        var orgId = ${orgIdLiteral};
        var authJson = JSON.stringify({ token: token });

        // H5 主项目 / h5-tixian / h5-organization-settled 的公共登录态
        try { window.sessionStorage.setItem('niko-auth', authJson); } catch (e) {}
        try { window.localStorage.setItem('niko-auth', authJson); } catch (e) {}

        // h5-tixian：sessionStorage['token']
        try { window.sessionStorage.setItem('token', token); } catch (e) {}

        // h5-organization：localStorage['token'] + sessionStorage['organizationInfoObj']
        try { window.localStorage.setItem('token', token); } catch (e) {}
        if (orgId !== null) {
          var orgJson = JSON.stringify({ id: orgId });
          try { window.sessionStorage.setItem('organizationInfoObj', orgJson); } catch (e) {}
          try { window.sessionStorage.setItem('organizationInfo', orgJson); } catch (e) {}
        }

        // h5-organization-settled：localStorage['guild_token']
        try { window.localStorage.setItem('guild_token', token); } catch (e) {}

        // 兼容监听 message 握手的子应用
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'SSO_TOKEN', token: token },
          origin: origin,
        }));

        // 首次拿到该 token 时标记并要求 reload，让页面启动时就能读到登录态
        var marker = null;
        try { marker = window.sessionStorage.getItem('__niko_sso_token'); } catch (e) {}
        if (marker !== token) {
          try { window.sessionStorage.setItem('__niko_sso_token', token); } catch (e) {}
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    })();
  `;
  internalPageWindow.webContents
    .executeJavaScript(script, true)
    .then((needReload) => {
      if (needReload && internalPageWindow && !internalPageWindow.isDestroyed()) {
        internalPageWindow.webContents.reload();
      }
    })
    .catch(() => {});
}

/**
 * 内嵌 H5 业务页窗口尺寸：固定 580 × 1200（不超过屏幕可用区域）。
 */
function computeInternalPageBounds() {
  const { screen } = require('electron');
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  return {
    width: Math.min(580, workArea.width),
    height: Math.min(1200, workArea.height),
  };
}

/**
 * 把 SSO 参数编码成 preload 可读的命令行参数（页面脚本执行前就能拿到登录态）
 */
function buildInternalPageSso(sso) {
  if (!sso || !sso.token) {
    return null;
  }
  const payload = {
    token: String(sso.token),
    origin: String(sso.origin || ''),
    organizationId: sso.organizationId !== undefined && sso.organizationId !== null
      ? Number(sso.organizationId)
      : null,
  };
  return {
    payload,
    arg: `--niko-sso=${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')}`,
    key: `${payload.token}|${payload.origin}|${payload.organizationId}`,
  };
}

/**
 * 子应用用绝对路径整页跳转（如 settled 的 window.location.href = '/settle'）会丢掉部署基路径，
 * 这里把这类跳转改回「同一个子应用目录 + hash 路由」，避免出现服务器 404。
 */
function rewriteInternalPageRedirect(targetUrl) {
  if (!internalPageWindow || internalPageWindow.isDestroyed()) {
    return null;
  }
  try {
    const target = new URL(targetUrl);
    const current = new URL(internalPageWindow.webContents.getURL());
    if (target.origin !== current.origin) {
      return null;
    }
    const baseDir = current.pathname; // 例如 /organization-settled/
    if (!baseDir || baseDir === '/' || target.pathname.startsWith(baseDir)) {
      return null;
    }
    const hashPath = target.pathname.replace(/\/$/, '');
    return `${target.origin}${baseDir}#${hashPath}${target.search || ''}${target.hash || ''}`;
  } catch (e) {
    return null;
  }
}

/**
 * 内嵌 H5 业务页每次打开都换一个时间戳参数，并禁用 HTTP 缓存，
 * 避免子应用更新后仍加载到旧的 index.html / 旧路由。
 */
function withInternalPageCacheBuster(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('_t', String(Date.now()));
    return parsed.toString();
  } catch (e) {
    return rawUrl;
  }
}

function loadInternalPageUrl(rawUrl) {
  if (!internalPageWindow || internalPageWindow.isDestroyed()) {
    return;
  }
  internalPageWindow.loadURL(withInternalPageCacheBuster(rawUrl), {
    extraHeaders: 'pragma: no-cache\ncache-control: no-cache\n',
  });
}

function openInternalPage(url, title, sso) {
  // 每次打开都更新 SSO 配置（不同入口可能拿到不同 token / 组织信息）
  internalPageSso = sso && sso.token
    ? {
      token: String(sso.token),
      origin: String(sso.origin || ''),
      organizationId: sso.organizationId,
    }
    : null;
  const ssoInfo = buildInternalPageSso(sso);
  if (internalPageWindow && !internalPageWindow.isDestroyed()) {
    // preload 参数只在创建时生效，登录态/组织变化时重建窗口，避免页面读到旧 token
    if (ssoInfo && internalPageSsoKey && ssoInfo.key !== internalPageSsoKey) {
      internalPageWindow.destroy();
      internalPageWindow = null;
    }
  }
  if (internalPageWindow && !internalPageWindow.isDestroyed()) {
    if (title) {
      internalPageWindow.setTitle(title);
    }
    // 复用的窗口也按当前屏幕重新算尺寸，避免留在旧尺寸
    const bounds = computeInternalPageBounds();
    internalPageWindow.setBounds(bounds);
    internalPageWindow.center();
    loadInternalPageUrl(url);
    internalPageWindow.show();
    internalPageWindow.focus();
    return;
  }
  const bounds = computeInternalPageBounds();
  internalPageSsoKey = ssoInfo ? ssoInfo.key : null;
  internalPageWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 580,
    minHeight: 700,
    maxWidth: 580,
    maxHeight: 1200,
    resizable: true,
    show: false,
    parent: windowMap.main || undefined,
    title: title || 'Niko直播',
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      // 外部业务页：只加载 SSO 预注入 preload，页面本身没有 node 能力
      preload: path.join(__dirname, 'TUILiveKit.sso.preload.js'),
      additionalArguments: ssoInfo ? [ssoInfo.arg] : [],
      // preload 需要完整 Node 能力（读取命令行里的 SSO 参数）
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      // 与主窗口共享同一个 cookie jar，使登录态互通
      // 默认 partition 为空字符串，走 session.defaultSession
    },
  });
  internalPageWindow.center();
  internalPageWindow.webContents.setUserAgent(CHROME_LIKE_UA);
  // 兜底注入（preload 已写入时标记命中，不会 reload）+ 拦截子应用丢了基路径的整页跳转
  internalPageWindow.webContents.on('did-finish-load', injectSsoToInternalPage);
  internalPageWindow.webContents.on('did-navigate-in-page', injectSsoToInternalPage);
  internalPageWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const rewritten = rewriteInternalPageRedirect(targetUrl);
    if (rewritten) {
      event.preventDefault();
      internalPageWindow.loadURL(rewritten);
    }
  });
  // 只在页面真正加载完成（含 hash）后显示，避免先闪一下空窗口/旧页面
  internalPageWindow.once('ready-to-show', () => {
    if (internalPageWindow && !internalPageWindow.isDestroyed()) {
      internalPageWindow.show();
      internalPageWindow.focus();
    }
  });
  loadInternalPageUrl(url);
  internalPageWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[internalPage] did-fail-load:', code, desc, 'url:', url);
  });
  internalPageWindow.on('closed', () => {
    internalPageWindow = null;
    internalPageSso = null;
    internalPageSsoKey = null;
  });
}

ipcMain.on('open-internal-url', (_event, payload) => {
  const { url, title, sso } = payload || {};
  if (typeof url === 'string' && /^https?:\/\//.test(url)) {
    openInternalPage(url, title, sso);
  }
});

// ==================== 手机外形游戏窗口 ====================
let gameMobileWindow = null;
function openGameMobile(url, title) {
  if (!url || !/^https?:\/\//.test(url)) {
    console.warn('[gameMobile] invalid url:', url);
    return;
  }
  // iPhone 13 标准比例 390×844，外加外壳圆角视觉
  if (gameMobileWindow && !gameMobileWindow.isDestroyed()) {
    gameMobileWindow.setTitle(title || '手机游戏');
    const shellPath = path.join(__dirname, 'public', 'game-phone.html');
    gameMobileWindow.loadFile(shellPath, {
      query: { url, title: title || '手机游戏' },
    });
    gameMobileWindow.show();
    gameMobileWindow.focus();
    return;
  }
  gameMobileWindow = new BrowserWindow({
    width: 410,
    height: 870,
    minWidth: 360,
    minHeight: 640,
    resizable: true,
    maximizable: true,
    fullscreenable: false,
    frame: false,
    title: title || '手机游戏',
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'TUILiveKit.game.preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  gameMobileWindow.webContents.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  );
  const shellPath = path.join(__dirname, 'public', 'game-phone.html');
  gameMobileWindow.loadFile(shellPath, {
    query: { url, title: title || '手机游戏' },
  });
  gameMobileWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[gameMobile] did-fail-load:', code, desc);
  });
  gameMobileWindow.on('closed', () => {
    gameMobileWindow = null;
  });
}

ipcMain.on('open-game-mobile', (_event, payload) => {
  const { url, title } = payload || {};
  openGameMobile(url, title);
});

/** 退出直播间时关闭游戏窗口 */
ipcMain.on('close-game-mobile', () => {
  if (gameMobileWindow && !gameMobileWindow.isDestroyed()) {
    gameMobileWindow.close();
  }
  gameMobileWindow = null;
});

/** 游戏窗口自身的窗口控制（来自 TUILiveKit.game.preload.js） */
ipcMain.on('game-window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (isWindowAlive(win)) {
    win.minimize();
  }
});

ipcMain.on('game-window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!isWindowAlive(win)) {
    return;
  }
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('game-window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (isWindowAlive(win)) {
    win.close();
  }
});

/** 托盘菜单业务入口：先确保主窗口可见，再把动作转发给渲染进程处理 */
function notifyMainWindow(channel, payload) {
  const win = windowMap.main;
  if (!isWindowAlive(win)) {
    return;
  }
  if (!win.isVisible()) {
    win.show();
  }
  win.focus();
  win.webContents.send(channel, payload);
}

function createTray() {
  try {
    // 圆形托盘图标（16/32/48 多尺寸，适配 Windows 高 DPI 缩放）
    const { nativeImage } = require('electron');
    const trayIconPath = path.join(__dirname, 'build', 'icon-round-32x32.png');
    const trayIconLargePath = path.join(__dirname, 'build', 'icon-round-48x48.png');
    const trayIconSmallPath = path.join(__dirname, 'build', 'icon-round-16x16.png');
    const trayImg = nativeImage.createFromPath(trayIconPath);
    try { trayImg.addRepresentation({ scaleFactor: 2, file: trayIconLargePath }); } catch (_) {}
    try { trayImg.addRepresentation({ scaleFactor: 1, file: trayIconPath }); } catch (_) {}
    try { trayImg.addRepresentation({ scaleFactor: 0.5, file: trayIconSmallPath }); } catch (_) {}

    const iconPath = path.join(__dirname, 'favicon.ico');
    appTray = new Tray(trayImg);
    appTray.setToolTip('Niko直播');
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示 Niko 窗口',
        icon: trayIcon('show'),
        click: () => {
          if (isWindowAlive(windowMap.main)) {
            windowMap.main.show();
            windowMap.main.focus();
          }
        },
      },
      {
        label: '公会|家族',
        icon: trayIcon('users'),
        // 交给渲染进程处理：URL 与组织 id 都依赖当前环境（测试域 / 正式域）
        click: () => notifyMainWindow('open-organization-page', '公会|家族'),
      },
      {
        label: '提现',
        icon: trayIcon('wallet'),
        click: () => notifyMainWindow('open-withdraw-page', '提现'),
      },
      {
        label: '家族入驻',
        icon: trayIcon('home'),
        click: () => notifyMainWindow('open-settle-page', '家族入驻'),
      },
      {
        label: '公会入驻',
        icon: trayIcon('building'),
        click: () => notifyMainWindow('open-settle-page', '公会入驻'),
      },
      { type: 'separator' },
      {
        label: '重启 Niko',
        icon: trayIcon('restart'),
        click: () => {
          // 重启应用：开发模式（electron . --dist）下 argv[1] 是应用路径，
          // 转成绝对路径，避免重启后因工作目录变化找不到应用入口
          const args = process.argv.slice(1);
          if (!app.isPackaged && args.length > 0) {
            args[0] = path.resolve(args[0]);
          }
          isQuitting = true;
          app.relaunch({ args });
          app.exit(0);
        },
      },
      {
        label: '退出 Niko',
        icon: trayIcon('exit'),
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    appTray.setContextMenu(contextMenu);
    // 单击托盘图标恢复窗口
    appTray.on('click', () => {
      if (isWindowAlive(windowMap.main)) {
        if (windowMap.main.isVisible()) {
          windowMap.main.focus();
        } else {
          windowMap.main.show();
        }
      }
    });
  } catch (error) {
    console.error(`${logPrefix} createTray failed:`, error);
  }
}

function bindMainWindowEvent() {
  // 页面完全加载好（包括视频背景首帧渲染）后才显示窗口，
  // 避免用户看到"窗口先出来 → 慢慢加载内容"的过程
  windowMap.main?.once('ready-to-show', () => {
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.show();
    }
  });
  windowMap.main?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}main window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.main)) {
        windowMap.main.reload();
      }
    }, 1000);
  });

  windowMap.main?.webContents.on('did-finish-load', () => {
    console.log(`${logPrefix}main window: did-finish-load`);
    sendToWindow(windowMap.main, 'app-path', app.getAppPath());
    sendToWindow(windowMap.main, 'crash-file-path',`${crashFilePath}|${crashDumpsDir}`);
    if (isWindowAlive(windowMap.main)) {
      sendToWindow(windowMap.main, 'native-window-handle', windowMap.main.getNativeWindowHandle());
    }
    initMainWindowPage();
  });

  windowMap.main?.on('close', (event) => {
    // Let renderer decide whether the app can quit (e.g. stop live before exit)
    console.log(`${logPrefix} windowMap.main close`);
    if (!isQuitting) {
      event.preventDefault();
      // Use the new quit sequence with timeout fallback and retry mechanism
      initiateQuitSequence();
    }
  });

  windowMap.main?.on('closed', () => {
    console.log(`${logPrefix}closed windowMap.main`);
    if (windowMap.child && !windowMap.child.isDestroyed()) {
      windowMap.child.close();
    }
    windowMap.child = null;

    if (windowMap.mainCover && !windowMap.mainCover.isDestroyed()) {
      windowMap.mainCover.close();
    }
    windowMap.mainCover = null;

    if (windowMap.giftOverlay && !windowMap.giftOverlay.isDestroyed()) {
      windowMap.giftOverlay.close();
    }
    windowMap.giftOverlay = null;

    if (windowMap.confirm && !windowMap.confirm.isDestroyed()) {
      windowMap.confirm.close();
    }
    windowMap.confirm = null;

    if (initMainWindowTimer) {
      clearTimeout(initMainWindowTimer);
      initMainWindowTimer = null;
    }
    windowMap.main = null;

    unbindIPCMainEvent();
    liveKitEmitter.emit('closed');
  });

  windowMap.main.on('will-move', (event, newBounds) => {
    console.log('Main window will move', newBounds);
    const bounds = {
      x: coverWindowRelativeBounds.x + newBounds.x,
      y: coverWindowRelativeBounds.y + newBounds.y,
      width: coverWindowRelativeBounds.width,
      height: coverWindowRelativeBounds.height,
    };
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.setBounds(bounds);
    }
    if (isWindowAlive(windowMap.giftOverlay) && windowMap.giftOverlay.isVisible()
      && giftOverlayRelativeBounds.width > 0 && giftOverlayRelativeBounds.height > 0) {
      windowMap.giftOverlay.setBounds({
        x: giftOverlayRelativeBounds.x + newBounds.x,
        y: giftOverlayRelativeBounds.y + newBounds.y,
        width: giftOverlayRelativeBounds.width,
        height: giftOverlayRelativeBounds.height,
      });
    }
  });

  windowMap.main.on('will-resize', (event, newBounds, details) => {
    console.log('Main window will resize', newBounds, details);
    const bounds = {
      x: coverWindowRelativeBounds.x + newBounds.x,
      y: coverWindowRelativeBounds.y + newBounds.y,
      width: coverWindowRelativeBounds.width,
      height: coverWindowRelativeBounds.height,
    };
    if (isWindowAlive(windowMap.mainCover)) {
      windowMap.mainCover.setBounds(bounds);
    }
    if (isWindowAlive(windowMap.giftOverlay) && windowMap.giftOverlay.isVisible()
      && giftOverlayRelativeBounds.width > 0 && giftOverlayRelativeBounds.height > 0) {
      windowMap.giftOverlay.setBounds({
        x: giftOverlayRelativeBounds.x + newBounds.x,
        y: giftOverlayRelativeBounds.y + newBounds.y,
        width: giftOverlayRelativeBounds.width,
        height: giftOverlayRelativeBounds.height,
      });
    }
  });
}

function bindChildWindowEvent() {
  windowMap.child?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.reload();
      }
    }, 2000);
  });

  windowMap.child?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    sendToWindow(windowMap.child, 'app-path', app.getAppPath());
    if (isWindowAlive(windowMap.child)) {
      sendToWindow(windowMap.child, 'native-window-handle', windowMap.child.getNativeWindowHandle());
      sendToWindow(windowMap.child, 'window-type', 'child');
    }
    if (isWebContentsAlive(windowMap.child)) {
      windowMap.child.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-child\';');
    }
  });

  windowMap.child?.on('close', (event) => {
    // In quit flow, allow child window to close naturally.
    if (!isQuitting && isWindowAlive(windowMap.main) && isWindowAlive(windowMap.child)) {
      event.preventDefault();
      windowMap.child.hide();
    }
  });

  windowMap.child?.on('closed', () => {
    if (windowMap.child) {
      windowMap.child = null;
    }
  });

  windowMap.child?.on('will-move', () => {
    console.log('Child window will move');
    if (isWindowAlive(windowMap.mainCover) && windowMap.mainCover.isVisible()) {
      windowMap.mainCover.setIgnoreMouseEvents(false);
    }
  });

  windowMap.child?.on('moved', () => {
    console.log('Child window moved');
    if (isWindowAlive(windowMap.mainCover) && windowMap.mainCover.isVisible()) {
      windowMap.mainCover.setIgnoreMouseEvents(true, { forward: true });
    }
  });
}

function bindCoverWindowEvent() {
  windowMap.mainCover?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.reload();
      }
    }, 2000);
  });

  windowMap.mainCover?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    sendToWindow(windowMap.mainCover, 'app-path', app.getAppPath());
    if (isWindowAlive(windowMap.mainCover)) {
      sendToWindow(windowMap.mainCover, 'native-window-handle', windowMap.mainCover.getNativeWindowHandle());
      sendToWindow(windowMap.mainCover, 'window-type', 'cover');
    }
    if (isWebContentsAlive(windowMap.mainCover)) {
      windowMap.mainCover.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-cover\';');
    }
  });

  windowMap.mainCover?.on('focus', () => {
    // When only the cover (an owned child window of main) is activated after the
    // app was in background, Windows raises the cover above other apps but leaves
    // the owner (main) behind, so a third-party window can slip between cover (top)
    // and main (bottom). Re-raise the owner: moving main to top carries its owned
    // windows (cover/child) up with it, closing the gap. moveTop only reorders
    // z-order and does NOT steal focus, so the cover stays interactive.
    if (isWindowAlive(windowMap.main)) {
      windowMap.main.moveTop();
    }
    if (lastChildWindowCommand !== '') {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.show();
      }
    }
  });
}

function bindConfirmWindowEvent() {
  windowMap.confirm?.webContents.on('did-fail-load', () => {
    console.log(`${logPrefix}child window: did-fail-load, reload soon...`);
    setTimeout(() => {
      if (isWindowAlive(windowMap.confirm)) {
        windowMap.confirm.reload();
      }
    }, 2000);
  });

  windowMap.confirm?.webContents.on('did-finish-load', function(){
    console.log(`${logPrefix}child window: did-finish-load`);
    sendToWindow(windowMap.confirm, 'app-path', app.getAppPath());
    if (isWindowAlive(windowMap.confirm)) {
      sendToWindow(windowMap.confirm, 'native-window-handle', windowMap.confirm.getNativeWindowHandle());
      sendToWindow(windowMap.confirm, 'window-type', 'confirm');
    }
    if (isWebContentsAlive(windowMap.confirm)) {
      windowMap.confirm.webContents.executeJavaScript('window.location.hash = \'/tui-live-kit-confirm\';');
    }
  });
}

function openTUILiveKit() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const winWidth = width - 40;
  const winHeight = height - 40;

  // 主进程启动时同步预读登录页视频到内存，渲染进程用 IPC 拿 Buffer 生成 Blob URL，
  // 避免 file:// 协议下 Chromium preload="auto" 退化成 metadata 导致首帧加载慢
  preloadLoginVideo();

  // 创建窗口优先，避免 vue-devtools 下载（可能超时）阻塞窗口弹出
  createWindow(winWidth, winHeight);

  if (!app.isPackaged) {
    console.log(`${logPrefix}Added Extension: installing vue-dev tool (non-blocking)...`);
    try {
      const {
        default: installExtension,
        VUEJS_DEVTOOLS,
      } = require('electron-devtools-installer');
      installExtension(VUEJS_DEVTOOLS)
        .then((name) => {
          console.log(`${logPrefix}Added Extension:  ${name}`);
        })
        .catch((err) => {
          console.error(`${logPrefix}Added Extension failed: `, err);
        });
    } catch (e) {
      console.error(`${logPrefix}Failed to load electron-devtools-installer: `, e);
    }
  } else {
    console.log(`${logPrefix}Packaged env, create window without dev-tool extension.`);
  }
}

const TUILiveKitMain = {
  open: (args) => {
    if (!isWindowAlive(windowMap.main)) {
      if (args?.userInfo) {
        basicInfo.userInfo = args.userInfo;
      }
      openTUILiveKit();
    }
  },
  close: () => {
    if (isWindowAlive(windowMap.main)) {
      if (isWindowAlive(windowMap.child)) {
        windowMap.child.close();
      }
      windowMap.child = null;
      if (isWindowAlive(windowMap.mainCover)) {
        windowMap.mainCover.close();
      }
      windowMap.mainCover = null;
      if (windowMap.giftOverlay && !windowMap.giftOverlay.isDestroyed()) {
        windowMap.giftOverlay.close();
      }
      windowMap.giftOverlay = null;
      windowMap.main.close();
      windowMap.main = null;
    }
  },
  init: (args) => {
    if (args?.userInfo) {
      basicInfo.userInfo = args.userInfo;
      initMainWindowPage();
    } else {
      console.error(`${logPrefix}init() invalid parameter`);
    }
  },
  on(eventName, listener) {
    liveKitEmitter.on(eventName, listener);
  },
  off(eventName, listener) {
    liveKitEmitter.off(eventName, listener);
  }
}

exports.TUILiveKitMain = TUILiveKitMain;
exports.default = TUILiveKitMain;
