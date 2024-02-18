const {encode} = require("./AESCrypto");
const {encodeMac, generateTokenIdentifier} = require("./HmacCrypto");
const { selfReceiveDataHash } = require("./Process");

function postRestApi(data) {
    let head = {
        "to": "/topics/" + global.globalOption.pairingKey,
        "priority": "high",
        "data": data
    }

    let password = !global.globalOption.encryptionEnabled && global.globalOption.encryptionEnabled ? global.globalOption.encryptionPassword : Buffer.from(global.globalOption.userEmail, 'base64')
    let macIdentifier = generateTokenIdentifier(global.globalOption.identifierValue, global.globalOption.deviceName);
    let useHmac;

    switch(data.type) {
        case "pair|request_device_list":
        case "pair|request_pair":
        case "pair|response_device_list":
        case "pair|accept_pair":
            useHmac = false;
            break;
        default:
            useHmac = global.globalOption.authWithHMac;
            break;
    }

    if ((global.globalOption.encryptionEnabled && global.globalOption.encryptionPassword !== "") || global.globalOption.alwaysEncrypt) {
        if(useHmac) encodeMac(JSON.stringify(data), password, global.globalOption.identifierValue).then((encoded) => {
            if(encoded != null) {
                let newData = {};
                newData.encrypted = true
                newData.encryptedData = encoded
                newData.HmacID = macIdentifier;
                head.data = newData;
                postRestApiWithTopic(head)
            }
        })

        else encode(JSON.stringify(data), password).then((encoded) => {
                if(encoded != null) {
                    let newData = {};
                    newData.encrypted = true
                    newData.encryptedData = encoded
                    head.data.HmacID = "none";
                    head.data = newData;
                    postRestApiWithTopic(head)
                }
            })
    } else {
        if(useHmac) {
            encodeMac(JSON.stringify(data), null, global.globalOption.identifierValue).then((encoded) => {
                let newData = {}
                newData.encrypted = false
                newData.encryptedData = encoded
                newData.HmacID = macIdentifier;
                head.data = newData;
            })
        } else {
            head.data.HmacID = "none";
        }

        head.data.encrypted = false
        postRestApiWithTopic(head)
    }
}

function postRestApiWithTopic(data) {

    if(data.data.encryptedData != undefined) {
        selfReceiveDataHash.add(data.data.encryptedData.hash())
    }

    const FCM_API = "https://fcm.googleapis.com/fcm/send";
    const serverKey = global.globalOption.serverKey
    const contentType = "application/json";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", FCM_API)

    xhr.setRequestHeader("Authorization", serverKey)
    xhr.setRequestHeader("Content-Type", contentType)

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && global.globalOption.printDebugLog) {
            console.log(xhr.status + " "  + xhr.responseText)
        }
    };

    data.topic = global.globalOption.pairingKey
    xhr.send(JSON.stringify(data))
}

module.exports = {
    postRestApi
}