const {postRestApi} = require("./PostRequset");
const {getEventListener, EVENT_TYPE} = require("./Listener");

function responseDeviceInfoToFinder(device) {
    let data = {
        "type" : "pair|response_device_list",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId
    }

    if(global.globalOption.printDebugLog) console.log("sync sent", "response list: " + JSON.stringify(data))
    postRestApi(data)
}

function requestDeviceListWidely() {
    global.isFindingDeviceToPair = true
    let data = {
        "type" : "pair|request_device_list",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue
    }

    if(global.globalOption.printDebugLog) console.log("sync sent", "request list: " + JSON.stringify(data))
    postRestApi(data)
}

function onReceiveDeviceInfo(device) {
    getEventListener().emit(EVENT_TYPE.ON_DEVICE_FOUND, device)
}

function requestPair(device) {
    global.isFindingDeviceToPair = true
    let data = {
        "type" : "pair|request_pair",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId
    }

    if(global.globalOption.printDebugLog) console.log("sync sent", "request pair: " + JSON.stringify(data))
    postRestApi(data)
}

function responsePairAcceptation(device, accept) {
    if(accept) {
        for (let info of global.pairingProcessList) {
            if (info === device.toString()) {
                global.isListeningToPair = false

                const index = global.pairingProcessList.indexOf(info)
                if (index > -1) {
                    global.pairingProcessList.splice(index, 1)
                }
                break;
            }
        }
    }

    let data = {
        "type" : "pair|accept_pair",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId,
        "pair_accept" : accept ? "true" : "false"
    }

    let isNotRegistered = true;
    let dataToSave = device.deviceName + "|" + device.deviceId

    if(global.store.has("paired_list")) {
        for (let str of JSON.parse(global.store.get("paired_list"))) {
            if (str === dataToSave) {
                isNotRegistered = false;
                break;
            }
        }
    }

    if(isNotRegistered) {
        let newData = global.store.has("paired_list") ? JSON.parse(global.store.get("paired_list")) : []
        newData.push(dataToSave)
        global.store.set("paired_list", JSON.stringify(newData));
    }

    postRestApi(data)
}

function checkPairResultAndRegister(map, device) {
    if(map.pair_accept) {
        let isNotRegistered = true;
        let dataToSave = device.deviceName + "|" + device.deviceId

        for (let str of JSON.parse(global.store.get("paired_list"))) {
            if (str === dataToSave) {
                isNotRegistered = false;
                break;
            }
        }

        if(isNotRegistered) {
            let newData = JSON.parse(global.store.get("paired_list"))
            newData.push(dataToSave)
            global.store.set("paired_list", JSON.stringify(newData));
        }

        global.isFindingDeviceToPair = false;
        const index = global.pairingProcessList.indexOf(device)
        if (index > -1) {
            pairingProcessList.splice(index, 1)
        }
    }

    getEventListener().emit(EVENT_TYPE.ON_DEVICE_PAIR_RESULT, map)
}

function removePairedDevice(device) {
    let newData = JSON.parse(global.store.get("paired_list"))

    newData.splice(newData.indexOf(device.toString()), 1)
    global.store.set("paired_list", JSON.stringify(newData))
    global.actionListener.onDeviceRemoved(device)
}

function requestRemovePair(device) {
    let data = {
        "type" : "pair|request_remove",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId
    }

    postRestApi(data)
}

/**
 * @Deprecated
 */
function sendFindTaskNotification() {
    let data = {
        "type" : "pair|find",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "date" : new Date().getTime()
    }

    postRestApi(data)
}

function sendFindTargetDesignatedNotification(device) {
    let data = {
        "type" : "pair|find",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId,
        "date" : new Date().getTime()
    }

    postRestApi(data)
}

function requestData(device, dataType) {
    let data = {
        "type" : "pair|request_data",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId,
        "date" : new Date().getTime(),
        "request_data" : dataType
    }

    postRestApi(data)
}

function responseDataRequest(device, dataType, dataContent) {
    let data = {
        "type" : "pair|receive_data",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId,
        "date" : new Date().getTime(),
        "request_data" : dataType,
        "receive_data" : dataContent
    }

    postRestApi(data)
}

function requestAction(device, dataType, ...dataContent) {
    let string = ""
    if(dataContent.length > 1) {
        for(let i = 0;i < dataContent.length;i++) {
            const str = dataContent[i]
            string += str + "|"
        }
        string = string.substring(0, string.length - 1)
    } else if (dataContent.length === 1) string = dataContent[0]

    let data = {
        "type" : "pair|request_action",
        "device_name" : global.globalOption.deviceName,
        "device_id" : global.globalOption.identifierValue,
        "send_device_name" : device.deviceName,
        "send_device_id" : device.deviceId,
        "date" : new Date().getTime(),
        "request_action" : dataType,
        "action_args" : string
    }

    postRestApi(data)
}

module.exports = {
    //methods for pairing
    responseDeviceInfoToFinder,
    requestDeviceListWidely,
    requestPair,
    responsePairAcceptation,
    checkPairResultAndRegister,
    onReceiveDeviceInfo,
    removePairedDevice,
    requestRemovePair,

    //methods for actual use
    sendFindTaskNotification,
    sendFindTargetDesignatedNotification,
    requestData,
    responseDataRequest,
    requestAction
}
