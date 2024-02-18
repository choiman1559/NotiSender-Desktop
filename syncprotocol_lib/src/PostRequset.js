const {encode} = require("./AESCrypto");
const {encodeMac, generateTokenIdentifier} = require("./HmacCrypto");
const {google} = require("googleapis");
const ArrayList = require("arraylist-js");

function postRestApi(data) {
    let head = {
        "topic": global.globalOption.pairingKey,
        "android": {"priority": "high"},
        "data": data
    }

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
        let password;
        if(global.globalOption.encryptionEnabled) {
            password = global.globalOption.encryptionPassword;
        } else if(global.globalOption.alwaysEncrypt) {
            password = Buffer.from(global.globalOption.userEmail, 'utf-8').toString('base64')
        }

        if (useHmac) encodeMac(JSON.stringify(data), password, global.globalOption.identifierValue).then((encoded) => {
            if (encoded != null) {
                let newData = {};
                newData.encrypted = true
                newData.encryptedData = encoded
                newData.HmacID = macIdentifier;
                head.data = newData;
                cleanUpAndPostData(head)
            }
        })

        else encode(JSON.stringify(data), password).then((encoded) => {
            if (encoded != null) {
                let newData = {};
                newData.encrypted = true
                newData.encryptedData = encoded
                head.data.HmacID = "none";
                head.data = newData;
                cleanUpAndPostData(head)
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
        cleanUpAndPostData(head)
    }
}

function cleanUpAndPostData(head) {
    let dataToSend = {}
    const keyList = Object.keys(head.data)
    for(let keyIndex in keyList) {
        dataToSend[keyList[keyIndex]] = head.data[keyList[keyIndex]] + ""
    }

    head.data = dataToSend;
    head = { "message" : head }
    postRestApiWithTopic(head)
}

function postRestApiWithTopic(head) {
    if(head.message.data.encryptedData !== undefined) {
        if(global.selfReceiveDataHash == null) {
            global.selfReceiveDataHash = new ArrayList();
        }

        global.selfReceiveDataHash.add(getStringHash(head.message.data.encryptedData))
    }

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

            xhr.send(JSON.stringify(head))
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

function getStringHash(str) {
    let hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

module.exports = {
    postRestApi,
    getStringHash
}
