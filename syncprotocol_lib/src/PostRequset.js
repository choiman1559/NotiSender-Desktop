const {encode} = require("./AESCrypto");
const {encodeMac, generateTokenIdentifier} = require("./HmacCrypto");
const {google} = require("googleapis");

function postRestApi(data) {
    let head = {
        "topic": global.globalOption.pairingKey,
        "android": {"priority": "high"},
        "data": data
    }

    let password = !global.globalOption.encryptionEnabled && global.globalOption.encryptionEnabled ? global.globalOption.encryptionPassword : Buffer.from(global.globalOption.userEmail, 'base64')
    let macIdentifier = generateTokenIdentifier(global.globalOption.identifierValue, global.globalOption.deviceName);
    let useHmac;

    switch (data.type) {
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
        if (useHmac) encodeMac(JSON.stringify(data), password, global.globalOption.identifierValue).then((encoded) => {
            if (encoded != null) {
                let newData = {};
                newData.encrypted = true
                newData.encryptedData = encoded
                newData.HmacID = macIdentifier;
                head.data = newData;
                postRestApiWithTopic(head)
            }
        })

        else encode(JSON.stringify(data), password).then((encoded) => {
            if (encoded != null) {
                let newData = {};
                newData.encrypted = true
                newData.encryptedData = encoded
                head.data.HmacID = "none";
                head.data = newData;
                postRestApiWithTopic(head)
            }
        })
    } else {
        if (useHmac) {
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
        head.data.topic = global.globalOption.pairingKey

        let dataToSend = {}
        const keyList = Object.keys(head.data)
        for(let keyIndex in keyList) {
            dataToSend[keyList[keyIndex]] = head.data[keyList[keyIndex]] + ""
        }

        head.data = dataToSend;
        head = { "message" : head }
        postRestApiWithTopic(head)
    }
}

function postRestApiWithTopic(data) {
    getGoogleAccessToken().then((resolve, _) => {
        if(resolve != null) {
            const serverKey = "Bearer " + resolve
            const FCM_API = "https://fcm.googleapis.com/v1/projects/notisender-41c1b/messages:send";
            const contentType = "application/json; UTF-8";

            const xhr = new XMLHttpRequest();
            xhr.open("POST", FCM_API)

            xhr.setRequestHeader("Authorization", serverKey)
            xhr.setRequestHeader("Content-Type", contentType)

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && global.globalOption.printDebugLog) {
                    console.log(xhr.status + " " + xhr.responseText)
                }
            };

            xhr.send(JSON.stringify(data))
        }
    })
}

function getGoogleAccessToken() {
    return new Promise(function(resolve, reject) {
        const key = global.globalOption.serverCredential
        const jwtClient = new google.auth.JWT(
            key.client_email,
            null,
            key.private_key,
            ["https://www.googleapis.com/auth/firebase.messaging"],
            null
        );

        jwtClient.authorize(function(err, tokens) {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

module.exports = {
    postRestApi
}
