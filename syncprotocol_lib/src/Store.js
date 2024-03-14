const Store = require('electron-store');
const {setup: setupPushReceiver} = require('@cuj1559/electron-push-receiver')

function initConfig(mainWindow) {
    Store.initRenderer()
    setupPushReceiver(mainWindow.webContents);
}

module.exports = {
    initConfig
}
