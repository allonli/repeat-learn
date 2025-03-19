const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 安全地暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统操作
  readFile: (filePath, encoding = 'utf8') => fs.readFileSync(filePath, encoding),
  writeFile: (filePath, data) => fs.writeFileSync(filePath, data),
  existsSync: (filePath) => fs.existsSync(filePath),
  readdirSync: (dirPath) => fs.readdirSync(dirPath),
  
  // 路径操作
  dirname: (filePath) => path.dirname(filePath),
  basename: (filePath, ext) => path.basename(filePath, ext),
  extname: (filePath) => path.extname(filePath),
  join: (...paths) => path.join(...paths),
  
  // IPC通信
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
  
  // 应用程序路径
  getAppPath: () => ipcRenderer.sendSync('get-app-path')
}); 