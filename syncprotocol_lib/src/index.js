const {ipcRenderer} = require('electron')
const {onMessageReceived} = require("./Process");
const Store = require('electron-store');
const Listener = require('./Listener')
const {getThisDeviceType} = require('./DeviceType')

const {
    START_NOTIFICATION_SERVICE,
    NOTIFICATION_SERVICE_STARTED,
    NOTIFICATION_SERVICE_ERROR,
    NOTIFICATION_RECEIVED,
    TOKEN_UPDATED,
} = require('@cuj1559/electron-push-receiver/src/constants')

function setConnectionOption(option) {
    global.globalOption = option
}

function initialize(option, action) {
    console.log('Start initialize protocol')
    global.globalOption = option
    global.isFindingDeviceToPair = false;
    global.isListeningToPair = false;
    global.actionListener = action
    global.pairingProcessList = []
    global.store = new Store()
    global.thisDeviceType = getThisDeviceType()
    Listener.init()

    ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => {
        if (global.globalOption.printDebugLog) console.log('service successfully started', token)
        global.deviceToken = token;

        fetch('https://iid.googleapis.com/iid/v1/' + token + '/rel/topics/' + global.globalOption.pairingKey, {
            method: 'POST',
            headers: new Headers({
                'Authorization': global.globalOption.serverKey
            })
        }).then(response => {
            if (response.status < 200 || response.status >= 400) {
                throw 'Error subscribing to topic: ' + response.status + ' - ' + response.text();
            }
            if (global.globalOption.printDebugLog) console.log('Subscribed to "' + global.globalOption.pairingKey + '"');
        }).catch(error => {
            if (global.globalOption.printDebugLog) console.error(error);
        })
    })

    ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_, error) => {
        if (global.globalOption.printDebugLog) console.log('notification error', error)
    })

    ipcRenderer.on(TOKEN_UPDATED, (_, token) => {
        if (global.globalOption.printDebugLog) console.log('token updated', token)
    })

    ipcRenderer.on(NOTIFICATION_RECEIVED, (_, serverNotificationPayload) => {
        if(global.globalOption.enabled) onMessageReceived(serverNotificationPayload.data)
    })

    if (global.globalOption.printDebugLog) console.log('starting service and registering a client')
    let firebaseHttpCredential = global.globalOption.firebaseHttpCredential
    ipcRenderer.send(START_NOTIFICATION_SERVICE,
        firebaseHttpCredential.appID,
        firebaseHttpCredential.projectID,
        firebaseHttpCredential.apiKey,
        firebaseHttpCredential.vapidKey
    )
}

module.exports = {
    initialize, setConnectionOption
};
