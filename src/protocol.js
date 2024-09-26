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
const firebaseConfig = require("./credential/firebase-config.json");
const firebaseCredential = require("./credential/service-account.json");
const firebaseHttpCredential = require("./credential/firebase-credential.json");
const fs = require("fs");
const {NotificationData} = require("./NotificationData");

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
    option.authWithHMac = getPreferenceValue("useHMAC", false)
    option.alwaysEncrypt = getPreferenceValue("alwaysEncrypt", true)
    option.enforceBackendProxy = getPreferenceValue("enforceBackendProxy", false)
    option.userEmail = getPreferenceValue("userEmail", "")

    //Non-Customizable options
    option.senderId = firebaseConfig.senderId
    option.serverKey = firebaseConfig.serverKey
    option.serverCredential = firebaseCredential
    option.firebaseHttpCredential = firebaseHttpCredential
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
                    const pathReference = ref(storage, global.globalOption.pairingKey + '/fileTransfer/' + actionArgs[0])

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

                case "toggle_service":
                    const changedValue = actionArgs[0] === "true"
                    store.set("notificationToggle", changedValue)
                    dataSetChangeListener.emit("notificationToggle", changedValue)
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
                    let notificationEnabled = store.get("notificationToggle")
                    if(notificationEnabled == null || notificationEnabled === "") notificationEnabled = "true"

                    dataToSend = (level * 100) + "|" + charging + "|false|" + notificationEnabled
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
        let deviceToFind = new Device(map.device_name, map.device_id)

        if(getPreferenceValue("deadlineTime", false) && map.date !== undefined) {
            const deadlineTimeInMin = getPreferenceValue("deadlineTimeValue", -1)
            const nowInMill = Date.now()
            const sentDateInMill = Date.parse(map.date)

            if(deadlineTimeInMin !== -1 && nowInMill - sentDateInMill > deadlineTimeInMin * 60000) return
        }

        if (store.has("paired_list")) {
            let value = JSON.parse(store.get("paired_list"))
            let isPaired = false;

            if (value.length > 0) for (let i = 0; i < value.length; i++) {
                const arr = value[i].split("|")
                let device = new Device(arr[0], arr[1])
                if(device.equals(deviceToFind)) {
                    isPaired = true;
                    break;
                }
            }

            if(getPreferenceValue("allowOnlyPaired", false) && !isPaired) {
                return;
            }
        }

        switch (map.type) {
            case "send|normal":
                if(getPreferenceValue("notificationToggle", true)
                    && !store.get("notificationBlackList", []).includes(deviceToFind.deviceId)) {
                    sendNotification(map);
                }
                break;

            case "send|sms":
                if(getPreferenceValue("telephony", false)) {
                    sendSmsNotification(map);
                }
                break;

            case "send|telecom":
                if(getPreferenceValue("telephony", false)) {
                    sendTelecomNotification(map);
                }
                break;

            case "media|meta_data":
                if(getPreferenceValue("media", false)) {
                    //TODO: implement media sync
                }
                break;
        }
    }
}

function init() {
    Protocol.initialize(settingOption(), new Actions())
}

function changeOption(needReset) {
    setConnectionOption(settingOption())
    if(needReset !== undefined && needReset) {
        init()
    }
}

ipcRenderer.on("download_complete", (_, file) => {
    console.log(`download URL: ${file}`);
    new Notification("Download Completed", {
        body: "Downloaded file saved at: " + file,
        icon: path.join(__dirname, '/res/icon.png'),
    })
});

function sendNotification(map) {
    const notificationData = NotificationData.parseFrom(map.notification_data);
    if(global.globalOption.printDebugLog) console.log(notificationData)

    function isIconBlank(icon) {
        return icon === undefined || icon === "" || icon === "none"
    }

    if(isIconBlank(notificationData.bigIcon) && isIconBlank(notificationData.smallIcon)) {
        let title = notificationData.title
        let content = notificationData.message

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
    const notificationData = NotificationData.parseFrom(map.notification_data)
    let title = notificationData.title
    let content = notificationData.message

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
    const nickname = map.nickname

    let notification = new Notification("New message from " + address + (nickname === undefined || nickname === '' ? "" : " (" + nickname + ")"), {
        body: message,
    })

    notification.onclick = () => {
        ipcRenderer.send("notification_detail", map)
    }
}

function sendTelecomNotification(map) {
    const address = map.address
    const nickname = map.nickname

    let notification = new Notification("New call inbound from " + address + (nickname === undefined || nickname === '' ? "" : " (" + nickname + ")"), {
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
