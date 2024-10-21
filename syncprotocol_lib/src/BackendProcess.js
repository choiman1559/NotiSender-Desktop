const {shaAndHex} = require("./AESCrypto");
const {getAuth} = require("firebase/auth");

class BackendConst {
    static SERVICE_TYPE_PACKET_PROXY = "type_packet_proxy"
    static SERVICE_TYPE_PACKET_BONDING = "type_packet_bonding"
    static SERVICE_TYPE_LIVE_NOTIFICATION = "type_live_notification"

    static REQUEST_POST_SHORT_TERM_DATA = "request_post_short_term_data"
    static REQUEST_GET_SHORT_TERM_DATA = "request_get_short_term_data"

    static STATUS_ERROR = "error"
    static STATUS_OK = "ok"

    static KEY_DEVICE_ID = "device_id"
    static KEY_DEVICE_NAME = "device_name"
    static KEY_SEND_DEVICE_ID = "send_device_id"
    static KEY_SEND_DEVICE_NAME = "send_device_name"
    static KEY_IS_SUCCESS = "is_success"
    static KEY_PACKET_BONDING_ARRAY = "packet_bonding_array";

    static KEY_ACTION_TYPE = "action_type"
    static KEY_UID = "uid"
    static KEY_DATA_KEY = "data_key"
    static KEY_EXTRA_DATA = "extra_data"

    static contentType = "application/json"
    static API_ROUTE_SCHEMA = "{0}/{1}/v1/service={2}"
    static API_DOMAIN = "https://cuj1559.ddns.net"
    static API_PUBLIC_ROUTE = "api"
    static API_DEBUG_ROUTE = "api_test"
}

class BackendResult {
    status;
    errorCause;
    extraData;

    static parseFrom(jsonObject) {
        let obj = new BackendResult()
        obj.status = jsonObject.status;
        obj.extraData = jsonObject.extraData;
        obj.errorCause = jsonObject.errorCause;
        return obj;
    }

    isResultOk() {
        return this.status === BackendConst.STATUS_OK
    }

    getErrorCause() {
        return this.errorCause
    }

    getExtraData() {
        return this.extraData
    }
}

class BackendProcess {
    static postProxy(data, hash, callback) {
        let sendDeviceId = data[BackendConst.KEY_DEVICE_ID]
        let dataHashKey = shaAndHex(sendDeviceId + hash)

        let serverBody = {};
        serverBody[BackendConst.KEY_ACTION_TYPE] = BackendConst.REQUEST_POST_SHORT_TERM_DATA
        serverBody[BackendConst.KEY_DATA_KEY] = dataHashKey
        serverBody[BackendConst.KEY_EXTRA_DATA] = JSON.stringify(data)

        BackendProcess.sendPacket(BackendConst.SERVICE_TYPE_PACKET_PROXY, serverBody, result => {
            if (result.isResultOk()) {
                callback(true)
            } else {
                callback(false)
                if (global.globalOption.printDebugLog)
                    console.log('Error while processing proxy: ' + result.getErrorCause())
            }
        })
    }

    static receptionProxy(data, callback) {
        let sendDeviceId = data[BackendConst.KEY_DEVICE_ID]
        let dataHashKey = shaAndHex(sendDeviceId + data[BackendConst.KEY_DATA_KEY])

        let serverBody = {};
        serverBody[BackendConst.KEY_SEND_DEVICE_NAME] = data[BackendConst.KEY_DEVICE_NAME]
        serverBody[BackendConst.KEY_SEND_DEVICE_ID] = data[BackendConst.KEY_DEVICE_ID]
        serverBody[BackendConst.KEY_ACTION_TYPE] = BackendConst.REQUEST_GET_SHORT_TERM_DATA
        serverBody[BackendConst.KEY_DATA_KEY] = dataHashKey

        BackendProcess.sendPacket(BackendConst.SERVICE_TYPE_PACKET_PROXY, serverBody, result => {
            if (result.isResultOk()) {
                callback(JSON.parse(result.getExtraData()))
            } else if (global.globalOption.printDebugLog) console.log('Error while processing proxy: ' + result.getErrorCause())
        })
    }

    static sendPacket(type, data, callback) {
        data[BackendConst.KEY_UID] = global.globalOption.pairingKey;
        data[BackendConst.KEY_DEVICE_NAME] = global.globalOption.deviceName
        data[BackendConst.KEY_DEVICE_ID] = global.globalOption.identifierValue

        String.format = function () {
            let s = arguments[0];
            for (let i = 0; i < arguments.length - 1; i++) {
                let reg = new RegExp("\\{" + i + "\\}", "gm");
                s = s.replace(reg, arguments[i + 1]);
            }
            return s;
        }

        let uri = String.format(BackendConst.API_ROUTE_SCHEMA, BackendConst.API_DOMAIN,
            global.globalOption.printDebugLog ? BackendConst.API_DEBUG_ROUTE : BackendConst.API_PUBLIC_ROUTE, type)

        const auth = getAuth();
        auth.currentUser.getIdToken(true).then(function (idToken) {
            if (idToken != null) {
                fetch(uri, {
                    body: JSON.stringify(data),
                    method: 'POST',
                    headers: new Headers({
                        'Authorization': 'Bearer ' + idToken,
                        "Content-Type": BackendConst.contentType,
                    })
                }).then(async response => {
                    callback(BackendResult.parseFrom(JSON.parse(await response.text())))
                }).catch(error => {
                    if (global.globalOption.printDebugLog) console.log(error)
                })
            }
        }).catch(function (error) {
            if (global.globalOption.printDebugLog) console.log(error)
        });
    }
}

module.exports = {
    BackendProcess,
    BackendConst
}
