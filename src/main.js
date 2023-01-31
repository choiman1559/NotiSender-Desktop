const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const Tray = electron.Tray
const Menu = electron.Menu
const ipcMain = electron.ipcMain
const dialog = electron.dialog

const path = require('path')
const url = require('url')
const Store = require('electron-store')
const { initConfig } = require("syncprotocol/src/Store");
const { download } = require("electron-dl")

const firebaseConfig = require("./firebase-config.json");
const { decompressString } = require("syncprotocol/src/AESCrypto");
const fs = require("fs");
const ElectronGoogleOAuth2 = require('@getstation/electron-google-oauth2').default;
const myApiOauth = new ElectronGoogleOAuth2(firebaseConfig.CLIENT_ID, firebaseConfig.CLIENT_SECRET, firebaseConfig.SCOPES_LIST, { successRedirectURL: "https://choiman1559.github.io/NotiSender-Desktop/login_completed.html" });

let mainWindow
let isQuiting
let store = new Store()

let iconPath = path.join(__dirname, '/res/icon.png')
let trayIconPath = path.join(__dirname, '/res/tray_icon.png')

function createWindow() {
    const windowWidth = 440
    const windowHeight = 670

    mainWindow = new BrowserWindow({
        minWidth: windowWidth,
        maxWidth: windowWidth,
        width: windowWidth,

        minHeight: windowHeight,
        maxHeight: windowHeight,
        height: windowHeight,

        show: false,
        maximizable: false,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            nativeWindowOpen: true
        }
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    })).then(() => {
        mainWindow.title = "NotiSender"
        return true;
    })

    initConfig(mainWindow)

    const appIcon = new Tray(electron.nativeImage.createFromPath(trayIconPath));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open NotiSender', click: function () {
                mainWindow.show()
            }
        },
        {
            label: 'Quit NotiSender', click: function () {
                app.isQuiting = true
                app.quit()
            }
        }
    ]);

    appIcon.setContextMenu(contextMenu)

    mainWindow.on('close', function (event) {
        if (!isQuiting) {
            event.preventDefault()
            mainWindow.hide()
        }
    })

    mainWindow.on('minimize', function () {
    })

    mainWindow.on('show', function () {
    })

    mainWindow.setMenuBarVisibility(false)
}

app.on('before-quit', function () {
    isQuiting = true
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
})

app.setAsDefaultProtocolClient("NotiSender-Desktop");

ipcMain.on('goBack', async () => {
    mainWindow.webContents.goBack()
})

function getPreferenceValue(key, defValue) {
    const value = store.get(key)
    return value == null ? defValue : value
}

app.setLoginItemSettings({
    openAtLogin: getPreferenceValue("startWhenBoot", true)
})

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })

    app.on('ready', () => {
        createWindow()

        ipcMain.on("download_request", (event, info) => {
            download(mainWindow, info.url)
                .then(dl => mainWindow.webContents.send("download_complete", dl.getSavePath()));
        })

        const refreshToken = store.get("login_token")
        if (refreshToken !== null) {
            myApiOauth.setTokens({ refresh_token: refreshToken });
        }

        ipcMain.on("login_request", () => {
            myApiOauth.openAuthWindowAndGetTokens().then(token => {
                store.set("login_token", token)
                mainWindow.webContents.send("login_complete", token);
            });
        })

        ipcMain.on("notification_image_required", (event, map) => {
            const imageRaw = map.icon
            decompressString(imageRaw).then((decompressed) => {
                let imagePath = app.getPath('userData') + "/imageCache/"
                fs.mkdir(imagePath, { recursive: true }, () => {
                    const imageBuffer = Buffer.from(decompressed, 'base64');
                    let imageFile = app.getPath('userData') + "/imageCache/" + imageRaw.slice(0, 16) + ".png";
                    fs.writeFile(imageFile, imageBuffer, { flag: "wx" }, () => {
                        mainWindow.webContents.send("notification_image_saved", map, imageFile);
                    });
                })
            })
        })

        ipcMain.on("notification_detail", (event, map) => {
            mainWindow.show()
            mainWindow.webContents.send("notification_detail", map);
        })

        ipcMain.on("file_select_dialog", (event) => {
            dialog.showOpenDialog({ properties: ['openFile'] }).then(function (response) {
                if (!response.canceled) {
                    mainWindow.webContents.send("file_select_dialog_result", response.filePaths[0]);
                }
            });
        })
    })
}