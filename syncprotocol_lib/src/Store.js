const Store = require('electron-store');
const {setup: setupPushReceiver} = require('electron-push-receiver')

function initConfig(mainWindow) {
    Store.initRenderer()
    setupPushReceiver(mainWindow.webContents);
}

module.exports = {
    initConfig
}