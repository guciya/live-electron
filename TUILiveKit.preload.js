const logPrefix = '[TUILiveKit.preload]';

const { ipcRenderer } = require('electron');
const path = require('path');

// 同步从主进程拿登录页视频 Buffer（阻塞但 preload 在 HTML 解析前执行，不影响渲染）
// 让 Vue 组件 mount 时立刻有数据，省掉 onMounted async + IPC 开销
try {
  const videoBuf = ipcRenderer.sendSync('get-login-video-buffer');
  if (videoBuf && videoBuf.byteLength > 0) {
    window.__LOGIN_VIDEO_BUFFER__ = videoBuf;
    console.log(`${logPrefix} injected login video buffer: ${videoBuf.byteLength} bytes`);
  }
} catch (e) {
  console.warn(`${logPrefix} failed to get login video buffer:`, e.message);
}

ipcRenderer.on('crash-file-path', () => {
  // 静默接收，不再打印调试日志
});

ipcRenderer.on('native-window-handle', (event, args) => {
  window.nativeWindowHandle = args;
});

ipcRenderer.on('user-login', (event, { from, to }) => {
  if (to === 'main') {
    if (window.location.hash.indexOf('tui-live-kit-main') === -1) {
      window.location.hash = 'tui-live-kit-main';
    }
  } else if (to === 'child') {
    if (window.location.hash.indexOf('tui-live-kit-child') === -1) {
      window.location.hash = 'tui-live-kit-child';
    }
  } else if (to === 'cover') {
    if (window.location.hash.indexOf('tui-live-kit-cover') === -1) {
      window.location.hash = 'tui-live-kit-cover';
    }
  } else if (to === 'confirm') {
    if (window.location.hash.indexOf('tui-live-kit-confirm') === -1) {
      window.location.hash = 'tui-live-kit-confirm';
    }
  }
});

ipcRenderer.on('port-to-child', (event) => {
  window.mainWindowPortInChild = event.ports[0];
});

ipcRenderer.on('port-to-cover', (event) => {
  window.mainWindowPortInCover = event.ports[0];
});

ipcRenderer.on('port-to-confirm', (event) => {
  window.mainWindowPortInConfirm = event.ports[0];
});

window.ipcRenderer = ipcRenderer;

// 窗口角色标记（主进程通过 additionalArguments 传入，如 gift-overlay 覆盖窗口）：
// 在页面 JS 执行前暴露，供 Loading 启动页识别窗口身份、决定是否参与登录跳转
const windowRoleArg = process.argv.find((arg) => arg.startsWith('--window-role='));
window.__WINDOW_ROLE__ = windowRoleArg ? windowRoleArg.split('=')[1] : '';

window.path = path;
window.ROOT_PATH = path.join(__dirname, '../');
window.PUBLIC_PATH = path.join(__dirname);
ipcRenderer.on('app-path', (event, appPath) => {
  window.APP_PATH = appPath;
});
