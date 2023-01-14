const Device = require("./Device");
const {decode, decodeMac} = require("./AESCrypto");
const {getEventListener, EVENT_TYPE} = require("./Listener");

const {
    responseDeviceInfoToFinder,
    onReceiveDeviceInfo,
    checkPairResultAndRegister,
    removePairedDevice
} = require("./ProcessUtil");

function onMessageReceived(data) {
    //if(data.topic !== global.globalOption.pairingKey) return;
    if(data.encrypted === "true") {
        if(global.globalOption.encryptionEnabled && global.globalOption.encryptionPassword != null) {
            if(!data.send_device_name === global.globalOption.deviceName) return
            decode(data.encryptedData, global.globalOption.encryptionPassword).then(decodedData => {
                onMessageReceived(JSON.parse(decodedData.toString()))
            });
        }
    } else processReception(data)
}

function processReception(data) {
    const type = data.type
    const device = new Device(data.device_name, data.device_id)
    if(global.globalOption.printDebugLog) console.log(type + " " + device.toString())

    if (type != null && global.globalOption.pairingKey !== "") {
        if (type.startsWith("pair") && !isDeviceItself(data)) {
            switch (type) {
                case "pair|request_device_list":
                    //Target Device action
                    //Have to Send this device info Data Now
                    if (!isPairedDevice(data) || global.globalOption.showAlreadyConnected) {
                        if(global.pairingProcessList.indexOf(device.toString()) < 0) global.pairingProcessList.push(device.toString());
                        global.isListeningToPair = true;
                        responseDeviceInfoToFinder(device)
                    }
                    break;

                case "pair|response_device_list":
                    //Request Device Action
                    //Show device list here; give choice to user which device to pair
                    if (global.isFindingDeviceToPair && (!isPairedDevice(device) || global.globalOption.showAlreadyConnected)) {
                        if(global.pairingProcessList.indexOf(device.toString()) < 0) global.pairingProcessList.push(device.toString());
                        onReceiveDeviceInfo(device)
                    }
                    break;

                case "pair|request_pair":
                    //Target Device action
                    //Show choice notification (or activity) to user whether user wants to pair this device with another one or not
                    if (global.isListeningToPair && isTargetDevice(data)) {
                        for (let info of pairingProcessList) {
                            if (info === device.toString()) {
                                global.actionListener.showPairChoiceAction(device)
                            }
                        }
                        global.actionListener.showPairChoiceAction(device)
                    }
                    break;

                case "pair|accept_pair":
                    //Request Device Action
                    //Check if target accepted to pair and process result here
                    if (global.isFindingDeviceToPair && isTargetDevice(data)) {
                        for (let info of pairingProcessList) {
                            if (info === device.toString()) {
                                checkPairResultAndRegister(data, device)
                            }
                        }
                    }
                    break;

                case "pair|request_remove":
                    if(isTargetDevice(data) && isPairedDevice(device) && global.globalOption.allowRemovePairRemotely) {
                        removePairedDevice(device)
                    }
                    break;

                case "pair|request_data":
                    //process request normal data here sent by paired device(s).
                    if (isTargetDevice(data) && isPairedDevice(device)) {
                        global.actionListener.onDataRequested(data)
                    }
                    break;

                case "pair|receive_data":
                    //process received normal data here sent by paired device(s).
                    if (isTargetDevice(data) && isPairedDevice(device)) {
                        getEventListener().emit(EVENT_TYPE.ON_DATA_RECEIVED, data)
                    }
                    break;

                case "pair|request_action":
                    //process received action data here sent by paired device(s).
                    if (isTargetDevice(data) && isPairedDevice(device)) {
                        global.actionListener.onActionRequested(data)
                    }
                    break;

                case "pair|find":
                    if (isTargetDevice(data) && isPairedDevice(device) && !global.globalOption.receiveFindRequest) {
                        global.actionListener.onFindRequest()
                    }
                    break;

                default:
                    global.actionListener.onDefaultAction(data);
                    break;
            }
        }
    }
}

function isDeviceItself(map) {
    let Device_name = map.device_name
    let Device_id = map.device_id

    if (Device_id == null || Device_name == null) {
        Device_id = map.send_device_id
        Device_name = map.send_device_name
    }

    let DEVICE_NAME = global.globalOption.deviceName
    let DEVICE_ID = global.globalOption.identifierValue

    return DEVICE_NAME === Device_name && DEVICE_ID === Device_id;
}

function isTargetDevice(map) {
    let Device_name = map.send_device_name
    let Device_id = map.send_device_id

    let DEVICE_NAME = global.globalOption.deviceName
    let DEVICE_ID = global.globalOption.identifierValue

    return DEVICE_NAME === Device_name && DEVICE_ID === Device_id
}

function isPairedDevice(device) {
    let dataToFind = device.toString()
    let value = []
    if(global.store.has("paired_list")) value = JSON.parse(global.store.get("paired_list"))

    for (let i = 0;i < value.length; i++) {
        const str = value[i]
        if (str === dataToFind) return true;
    }
    return false;
}

module.exports = {
    onMessageReceived
}
