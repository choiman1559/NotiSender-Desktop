const {Device, parseDevice} = require("./Device");
const {decode} = require("./AESCrypto");
const {decodeMac, generateTokenIdentifier} = require("./HmacCrypto");
const {getEventListener, EVENT_TYPE} = require("./Listener");
const {getStringHash} = require("./PostRequset");
const ArrayList = require("arraylist-js");

const {
    responseDeviceInfoToFinder,
    onReceiveDeviceInfo,
    checkPairResultAndRegister,
    removePairedDevice
} = require("./ProcessUtil");

global.selfReceiveDataHash = new ArrayList();
let splitDataList = new ArrayList();

class SplitDataObject extends Object {
    constructor(map) {
        super(map);
        let indexInfo = map.split_index.split("/");
        let currentIndex = indexInfo[0];

        this.length = parseInt(indexInfo[1]);
        this.data = new Array(length);

        this.unique_id = map.split_unique
        this.data[currentIndex] = map.split_data
    }

    addData(map) {
        this.data[map.split_index.split("/")[0]] = map.split_data;
        return this;
    }

    getSize() {
        let i = 0;
        for(let obj of this.data) {
            if(obj !== undefined) {
                i += 1;
            }
        }
        return i;
    }

    getFullData() {
        let string = ""
        for(let str of this.data) {
            string += str;
        }
        return string;
    }

    data;
    unique_id;
    length;
}

function onMessageReceived(data) {
    if(data.topic !== global.globalOption.pairingKey) return;

    if(data.encryptedData != null || data.encryptedData !== undefined) {
        const dataHash = getStringHash(data.encryptedData);
        if(global.selfReceiveDataHash != null && global.selfReceiveDataHash.contains(dataHash)) {
            global.selfReceiveDataHash.remove(dataHash);
            return;
        }
    }

    if (data.encrypted === "true") {
        if ((global.globalOption.encryptionEnabled && global.globalOption.encryptionPassword != null) || global.globalOption.alwaysEncrypt) {
            let password;
            if(global.globalOption.encryptionEnabled) {
                password = global.globalOption.encryptionPassword;
            } else if(global.globalOption.alwaysEncrypt) {
                password = Buffer.from(global.globalOption.userEmail, 'utf-8').toString('base64')
            }

            if(global.globalOption.authWithHMac && data.HmacID !== "none") {
                onMessageReceivedHmac(data, password)
            } else {
                decode(data.encryptedData, password).then(decodedData => {
                    processReception(JSON.parse(decodedData.toString()))
                });
            }
        }
    } else {
        if(global.globalOption.authWithHMac && data.HmacID !== "none") {
            onMessageReceivedHmac(data, null)
        } else processReception(data)
    }
}

function onMessageReceivedHmac(data, password) {
    let device = null;
    let value = []
    if (global.store.has("paired_list")) value = JSON.parse(global.store.get("paired_list"))

    for (let str of value) {
        let deviceToMatch = parseDevice(str)
        if (data.HmacID === generateTokenIdentifier(deviceToMatch.deviceName, deviceToMatch.deviceId)) {
            device = deviceToMatch
            break
        }
    }

    if(device != null) {
        decodeMac(data.encryptedData, password, device.deviceId).then(decodedData => {
            processReception(JSON.parse(decodedData.toString()))
        })
    }
}

function processSplitData(data) {
    for (let i = 0; i < splitDataList.size(); i++) {
        let object = splitDataList.get(i);
        if (object.unique_id === data.split_unique) {
            object = object.addData(data);

            if (object.getSize() === object.length) {
                let newMap = JSON.parse(object.getFullData().toString())
                processReception(newMap);
                splitDataList.removeByObject(object);
            }
            return;
        }
    }

    splitDataList.add(new SplitDataObject(data));
}

function processReception(data) {
    const type = data.type
    const device = new Device(data.device_name, data.device_id)
    if(data.device_type != null) device.deviceType = data.device_type
    if (global.globalOption.printDebugLog) console.log(type + " " + device.toString())

    if (type != null && global.globalOption.pairingKey !== "") {
        if (!isDeviceItself(data)) {
            switch (type) {
                case "pair|request_device_list":
                    //Target Device action
                    //Have to Send this device info Data Now
                    if (!isPairedDevice(device) || global.globalOption.showAlreadyConnected) {
                        if (global.pairingProcessList.indexOf(device.toString()) < 0) global.pairingProcessList.push(device.toString());
                        global.isListeningToPair = true;
                        responseDeviceInfoToFinder(device)
                    }
                    break;


                case "pair|response_device_list":
                    //Request Device Action
                    //Show device list here; give choice to user which device to pair
                    if (global.isFindingDeviceToPair && (!isPairedDevice(device) || global.globalOption.showAlreadyConnected)) {
                        if (global.pairingProcessList.indexOf(device.toString()) < 0) global.pairingProcessList.push(device.toString());
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
                    if (isTargetDevice(data) && isPairedDevice(device) && global.globalOption.allowRemovePairRemotely) {
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

                case "split_data":
                    processSplitData(data)
                    break;

                default:
                    if(type.startsWith("send") || type.startsWith("reception")) {
                        global.actionListener.onDefaultAction(data);
                    }
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
    let value = []
    if (global.store.has("paired_list")) value = JSON.parse(global.store.get("paired_list"))

    for (let str of value) {
        if (device.equals(parseDevice(str))) return true;
    }
    return false;
}

module.exports = {
    onMessageReceived,
    selfReceiveDataHash
}
