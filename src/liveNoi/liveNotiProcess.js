const {BackendConst, BackendProcess} = require('syncprotocol/src/BackendProcess');
const {encode, shaAndHex, parseAESToken} = require("syncprotocol/src/AESCrypto");
const {postRestApi} = require("syncprotocol/src/PostRequset");
const ArrayList = require("arraylist-js");
const {NotificationData} = require("../NotificationData");

const REQUEST_LIVE_NOTIFICATION = "request_live_notification";
const RESPONSE_LIVE_NOTIFICATION = "response_live_notification";
const REQUEST_NOTIFICATION_ACTION = "response_notification_action";

let uniqueIdMap = new Map();
let resultCallback;

function processLiveNoti(map) {
    switch (map[BackendConst.KEY_ACTION_TYPE]) {
        case RESPONSE_LIVE_NOTIFICATION:
            responseLiveNotiData(map)
            break;

        case REQUEST_LIVE_NOTIFICATION:
        case REQUEST_NOTIFICATION_ACTION:
            console.log("Error:: Desktop Client Stub for Live Notification request!");
            break;
    }
}

async function requestLiveNotiData(deviceInfo, callback) {
    resultCallback = callback
    const uniqueId = shaAndHex(await encode(deviceInfo.deviceId + Date.now(), parseAESToken(global.globalOption.pairingKey)))
    let notificationBody = {};

    notificationBody["type"] = "pair|live_notification"
    notificationBody[BackendConst.KEY_ACTION_TYPE] = REQUEST_LIVE_NOTIFICATION
    notificationBody[BackendConst.KEY_DATA_KEY] = uniqueId
    notificationBody[BackendConst.KEY_DEVICE_NAME] = global.globalOption.deviceName
    notificationBody[BackendConst.KEY_DEVICE_ID] = global.globalOption.identifierValue
    notificationBody[BackendConst.KEY_SEND_DEVICE_NAME] = deviceInfo.deviceName
    notificationBody[BackendConst.KEY_SEND_DEVICE_ID] = deviceInfo.deviceId

    postRestApi(notificationBody)
    if(uniqueIdMap == null) {
        uniqueIdMap = new Map();
    }
    uniqueIdMap.set(deviceInfo.deviceId, uniqueId)
}

function responseLiveNotiData(map) {
    const sendDeviceName = map[BackendConst.KEY_DEVICE_NAME]
    const sendDeviceId = map[BackendConst.KEY_DEVICE_ID]

    if(uniqueIdMap == null || !uniqueIdMap.containsKey(map.get(BackendConst.KEY_DEVICE_ID))) {
        return;
    }

    let holdUniqueId = uniqueIdMap.get(map[BackendConst.KEY_DEVICE_ID])
    let receivedUniqueId = map[BackendConst.KEY_DATA_KEY]
    const finalUniqueId = shaAndHex(holdUniqueId + receivedUniqueId)

    let serverBody = {};
    serverBody[BackendConst.KEY_ACTION_TYPE] = BackendConst.REQUEST_GET_SHORT_TERM_DATA
    serverBody[BackendConst.KEY_DATA_KEY] = finalUniqueId
    serverBody[BackendConst.KEY_SEND_DEVICE_ID] = sendDeviceId
    serverBody[BackendConst.KEY_SEND_DEVICE_NAME] = sendDeviceName

    if("true".equals(map[BackendConst.KEY_IS_SUCCESS])) {
        BackendProcess.sendPacket(BackendConst.SERVICE_TYPE_LIVE_NOTIFICATION, serverBody, (result) => {
            if(result.isResultOk()) {
                const notificationList = new ArrayList();
                const notificationArray = result.getExtraData();

                for(let notificationRaw in notificationArray) {
                    notificationList.add(NotificationData.parseFrom(notificationRaw))
                }

                if(resultCallback != null) {
                    resultCallback(true, notificationList.list)
                }
            } else {
                if(resultCallback != null) {
                    resultCallback(false, null)
                }
            }
        })
    }
}

module.exports = {
    processLiveNoti,
    requestLiveNotiData
}