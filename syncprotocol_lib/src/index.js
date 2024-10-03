const {ipcRenderer} = require('electron')
const {onMessageReceived} = require("./Process");
const {getGoogleAccessToken} = require("./PostRequset");
const Store = require('electron-store');
const Listener = require('./Listener')
const {getThisDeviceType} = require('./DeviceType')

const {
    START_NOTIFICATION_SERVICE,
    NOTIFICATION_SERVICE_STARTED,
    NOTIFICATION_SERVICE_RESTARTED,
    NOTIFICATION_SERVICE_ERROR,
    NOTIFICATION_RECEIVED,
    TOKEN_UPDATED,
} = require('@cuj1559/electron-push-receiver/src/constants')

function setConnectionOption(option) {
    global.globalOption = option
}

let isListenerRegistered = false

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

    function initFcmToken(token) {
        global.deviceToken = token;
        getGoogleAccessToken().then((resolve, _) => {
            if (resolve != null) {
                if (global.globalOption.printDebugLog) console.log('service successfully started\nOAuth: ', resolve)
                fetch('https://iid.googleapis.com/iid/v1/' + token + '/rel/topics/' + global.globalOption.pairingKey, {
                    method: 'POST',
                    headers: new Headers({
                        'Authorization': 'Bearer ' + resolve,
                        "Content-Type": "application/json; UTF-8",
                        "access_token_auth": true
                    })
                }).then(response => {
                    if (response.status < 200 || response.status >= 400) {
                        throw 'Error subscribing to topic: ' + response.status + ' - ' + response.text();
                    }
                    if (global.globalOption.printDebugLog) console.log('Subscribed to "' + global.globalOption.pairingKey + '"');
                }).catch(error => {
                    if (global.globalOption.printDebugLog) console.error(error);
                })
            }
        })
    }

    if (global.globalOption.printDebugLog) console.log('starting service and registering a client')
    if(!isListenerRegistered) {
        ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => {
            initFcmToken(token)
        })

        ipcRenderer.on(NOTIFICATION_SERVICE_RESTARTED, (_, token) => {
            initFcmToken(token)
        })

        ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_, error) => {
            if (global.globalOption.printDebugLog) {
                console.log('notification error', error)
                throw error
            }
        })

        ipcRenderer.on(TOKEN_UPDATED, (_, token) => {
            if (global.globalOption.printDebugLog) console.log('token updated', token)
        })

        ipcRenderer.on(NOTIFICATION_RECEIVED, (_, serverNotificationPayload) => {
            if (global.globalOption.enabled) onMessageReceived(serverNotificationPayload.data)
        })

        let firebaseHttpCredential = global.globalOption.firebaseHttpCredential
        ipcRenderer.send(START_NOTIFICATION_SERVICE,
            firebaseHttpCredential.appID,
            firebaseHttpCredential.projectID,
            firebaseHttpCredential.apiKey,
            firebaseHttpCredential.vapidKey
        )

        isListenerRegistered = true
    }
}

module.exports = {
    initialize, setConnectionOption
};
