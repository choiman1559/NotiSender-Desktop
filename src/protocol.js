const Protocol = require("syncprotocol");
const ConnectionOption = require("syncprotocol/src/ConnectionOption");
const {PairAction} = require("syncprotocol/src/Actions");
const {responsePairAcceptation, responseDataRequest} = require("syncprotocol/src/ProcessUtil");
const {Device} = require("syncprotocol/src/Device");
const Store = require('electron-store');

const ipcRenderer = require("electron").ipcRenderer;
const path = require("path");
const battery = require("battery");
const {machineIdSync} = require('node-machine-id');
const EventEmitter = require("events");
const {setConnectionOption} = require("syncprotocol");
const keySender = require('./lib/key-sender')
const ChildProcess = require('child_process')
const clipboard = require('electron').clipboard;
const { getStorage, ref, getDownloadURL } = require("firebase/storage");
const firebaseConfig = require("./firebase-config.json");
const fs = require("fs");

const store = new Store()
function getPreferenceValue(key, defValue) {
    const value = store.get(key)
    return value == null ? defValue : value
}

function settingOption() {
    const option = new ConnectionOption()

    //Customizable options
    option.enabled = getPreferenceValue("enabled", true)
    option.encryptionEnabled = getPreferenceValue("encryptionEnabled", false)
    option.encryptionPassword = getPreferenceValue("encryptionPassword", "")
    option.printDebugLog = getPreferenceValue("printDebugLog", false)
    option.showAlreadyConnected = getPreferenceValue("showAlreadyConnected", false)
    option.receiveFindRequest = getPreferenceValue("receiveFindRequest", false)
    option.allowRemovePairRemotely = getPreferenceValue("allowRemovePairRemotely", true)
    option.pairingKey = getPreferenceValue("pairingKey", "test100")
    option.authWithHMac = getPreferenceValue("hmacAuthEnabled", false)

    //Non-Customizable options
    option.senderId = firebaseConfig.senderId
    option.serverKey = firebaseConfig.serverKey
    option.identifierValue = machineIdSync(true)
    option.deviceName = require("os").hostname()

    return option
}

class dataSetChange extends EventEmitter {
}

const dataSetChangeListener = new dataSetChange()

class Actions extends PairAction {
    async onActionRequested(map) {
        super.onActionRequested(map);
        const actionType = map.request_action
        const actionArg = map.action_args
        let actionArgs = [];

        if (actionArg != null) {
            actionArgs = actionArg.split("\|");
        }

        if (actionType != null) {
            switch (actionType) {
                case "Show notification with text":
                    new Notification(actionArgs[0], {
                        body: actionArgs[1],
                        icon: path.join(__dirname, '/res/icon.png'),
                    })
                    break;

                case "Copy text to clipboard":
                    clipboard.writeText(actionArgs[0])
                    break;

                case "Open link in Browser":
                    let url = actionArgs[0];
                    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "http://" + url;
                    await require('electron').shell.openExternal(url)
                    break;

                case "Run application":
                    await open.openApp(actionArgs[0]);
                    break;

                case "Run command":
                    ChildProcess.exec(actionArgs[0], (error, stdout, stderr) => {
                        if (error) {
                            console.log(`error: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            console.log(`stderr: ${stderr}`);
                            return;
                        }
                        console.log(`stdout: ${stdout}`);
                    });
                    break;

                case "Share file":
                    new Notification("Download File", {
                        body: "Download Started: " + actionArgs[0],
                        icon: path.join(__dirname, '/res/icon.png'),
                    })

                    const storage = getStorage()
                    const pathReference = ref(storage, global.globalOption.pairingKey + '/' + actionArgs[0])

                    getDownloadURL(pathReference).then((url) => {
                        console.log(`Start download URL: ${url}`);
                        ipcRenderer.send("download_request", {url: url})
                    }).catch(() => {
                        new Notification("Download File", {
                            body: "Download Failed!:" + actionArgs[0],
                            icon: path.join(__dirname, '/res/icon.png'),
                        })
                    });
                    break;

                case "PRESENTATION_KEY_PRESSED":
                    keySender.sendKey(actionArgs[0])
                    break;
            }
        }
    }

    onDataRequested(map) {
        super.onDataRequested(map);
        let dataToSend;
        switch (map.request_data) {
            case "battery_info":
                (async () => {
                    const {level, charging} = await battery();
                    dataToSend = (level * 100) + "|" + charging + "|false"
                    responseDataRequest(new Device(map.device_name, map.device_id), map.request_data, dataToSend);
                    //TODO: What about desktop devices?
                })();
                return;

            case "speed_test":
                dataToSend = new Date().getTime().toString();
                break;

            default:
                dataToSend = "";
                break;
        }

        if (dataToSend !== "") {
            responseDataRequest(new Device(map.device_name, map.device_id), map.request_data, dataToSend);
        }
    }

    onFindRequest() {
        super.onFindRequest();
        //Ignore for now
    }

    showPairChoiceAction(device) {
        super.showPairChoiceAction(device);
        let pairNotification = new Notification('New pair request incoming', {
            body: 'Requested Device: ' + device.deviceName + "\n\nClick this notification to pair",
            icon: path.join(__dirname, '/res/icon.png'),
        })

        pairNotification.onclick = () => {
            responsePairAcceptation(device, true)
            dataSetChangeListener.emit("changed")
        }
    }

    onDeviceRemoved(device) {
        dataSetChangeListener.emit("changed")
    }

    onDefaultAction(map) {
        super.onDefaultAction(map);
        if(getPreferenceValue("deadlineTime", false) && map.date !== undefined) {
            const deadlineTimeInMin = getPreferenceValue("deadlineTimeValue", -1)
            const nowInMill = Date.now()
            const sentDateInMill = Date.parse(map.date)

            if(deadlineTimeInMin !== -1 && nowInMill - sentDateInMill > deadlineTimeInMin * 60000) return
        }

        switch (map.type) {
            case "send|normal":
                sendNotification(map);
                break;
            case "send|sms":
                sendSmsNotification(map);
                break;
            case "send|telecom":
                sendTelecomNotification(map);
                break;
        }
    }
}

function init() {
    Protocol.initialize(settingOption(), new Actions())
}

function changeOption() {
    setConnectionOption(settingOption())
}

ipcRenderer.on("download_complete", (_, file) => {
    console.log(`download URL: ${file}`);
    new Notification("Download Completed", {
        body: "Downloaded file saved at: " + file,
        icon: path.join(__dirname, '/res/icon.png'),
    })
});

function sendNotification(map) {
    console.log(map)
    if(map.icon === undefined || map.icon === "none") {
        let title = map.title
        let content = map.message

        let notification = new Notification(title, {
            body: content,
        })

        notification.onclick = () => {
            ipcRenderer.send("notification_detail", map)
        }
    } else {
        ipcRenderer.send("notification_image_required", map)
    }
}

ipcRenderer.on("notification_image_saved", (_, map, image) => {
    let title = map.title
    let content = map.message

    let notification = new Notification(title, {
        body: content,
        icon: image,
    })

    notification.onshow = () => {
        fs.rmSync(image)
    }

    notification.onclick = () => {
        ipcRenderer.send("notification_detail", map)
    }
});

function sendSmsNotification(map) {
    const address = map.address
    const message = map.message

    let notification = new Notification("New message from " + address, {
        body: message,
    })

    notification.onclick = () => {
        ipcRenderer.send("notification_detail", map)
    }
}

function sendTelecomNotification(map) {
    const address = map.address
    let notification = new Notification("New call inbound from " + address, {
        body: "click here to reply or check detail",
    })

    notification.onclick = () => {
        ipcRenderer.send("notification_detail", map)
    }
}

module.exports = {
    init,
    dataSetChangeListener,
    changeOption
}