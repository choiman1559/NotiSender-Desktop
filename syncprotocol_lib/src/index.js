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
let lastPairingKey = ""

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

    function initFcmToken(projectId, token) {
        global.deviceToken = token;

        getGoogleAccessToken().then((accessToken) => {
            if (accessToken != null) {
                if (global.globalOption.printDebugLog) {
                    console.log('service successfully started\nOAuth: ', accessToken);
                }

                const topic = encodeURIComponent(global.globalOption.pairingKey);
                const registration = encodeURIComponent(token);
                const project = encodeURIComponent(projectId);

                fetch(
                    'https://fcm.googleapis.com/v1/projects/' + project + '/registrations/' + registration + '/topicSubscriptions?topic_name=' + topic,
                    {
                        method: 'POST',
                        headers: new Headers({
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json'
                        }),
                        body: '{}'
                    }
                ).then(async (response) => {
                    const responseBody = await response.text();
                    if (response.status !== 409 && (response.status < 200 || response.status >= 300)) {
                        throw new Error('Error subscribing to topic: ' + response.status + ' - ' + responseBody);
                    }

                    if (global.globalOption.printDebugLog) {
                        console.log(
                            response.status === 409
                                ? 'Already subscribed to "' + global.globalOption.pairingKey + '"'
                                : 'Subscribed to "' + global.globalOption.pairingKey + '"'
                        );
                    }
                }).catch((error) => {
                    if (global.globalOption.printDebugLog) {
                        console.error(error);
                    }
                });
            }
        }).catch((error) => {
            if (global.globalOption.printDebugLog) {
                console.error(error);
            }
        });
    }

    if (global.globalOption.printDebugLog) console.log('starting service and registering a client')
    let firebaseHttpCredential = global.globalOption.firebaseHttpCredential

    if (!isListenerRegistered) {
        ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_, token) => {
            initFcmToken(firebaseHttpCredential.projectID, token)
        })

        ipcRenderer.on(NOTIFICATION_SERVICE_RESTARTED, (_, token) => {
            initFcmToken(firebaseHttpCredential.projectID, token)
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

        ipcRenderer.send(START_NOTIFICATION_SERVICE,
            firebaseHttpCredential.appID,
            firebaseHttpCredential.projectID,
            firebaseHttpCredential.apiKey,
            firebaseHttpCredential.vapidKey
        )

        isListenerRegistered = true
    } else if (global.globalOption.pairingKey !== lastPairingKey) {
        initFcmToken(firebaseHttpCredential.projectID, global.deviceToken)
        lastPairingKey = global.globalOption.pairingKey
    }
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
    initialize, setConnectionOption
};
