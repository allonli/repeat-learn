const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const remoteMain = require('@electron/remote/main');

// 初始化 @electron/remote (只初始化一次)
remoteMain.initialize();

// 保持对窗口对象的全局引用，避免 JavaScript 对象被垃圾回收时窗口被关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    resizable: true,
    webPreferences: {
      nodeIntegration: true,     // 启用 Node.js 集成
      contextIsolation: false,   // 禁用上下文隔离
      enableRemoteModule: true,  // 启用远程模块
      webSecurity: true,         // 启用web安全性
    }
  });

  // 为当前窗口启用 remote
  remoteMain.enable(mainWindow.webContents);

  // 添加内容安全策略
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; media-src 'self' file:"]
      }
    });
  });

  // 加载应用的 index.html
  mainWindow.loadFile(path.join(__dirname, '../../src/renderer/public/index.html'));

  // 窗口关闭时触发
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 应用程序准备就绪时创建窗口
app.whenReady().then(createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口
  if (mainWindow === null) createWindow();
});