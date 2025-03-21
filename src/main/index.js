const { app, BrowserWindow } = require('electron');

// 忽略 IMK 警告
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
if (process.platform === 'darwin') {
    process.on('console.error', (error) => {
        if (error.includes('IMKCFRunLoopWakeUpReliable')) {
            return;
        }
        console.error(error);
    });
    app.disableHardwareAcceleration();
} 