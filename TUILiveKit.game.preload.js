/**
 * 手机外形游戏窗口的 preload。
 * 只暴露窗口控制能力（最小化/最大化/关闭），不暴露任何 Node 能力，
 * 游戏页面本身仍然运行在 nodeIntegration=false 的隔离环境里。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameWindowApi', {
  minimize: () => ipcRenderer.send('game-window-minimize'),
  toggleMaximize: () => ipcRenderer.send('game-window-toggle-maximize'),
  close: () => ipcRenderer.send('game-window-close'),
});
