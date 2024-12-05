const {decompressString} = require("syncprotocol/src/AESCrypto");

//noinspection JSUnusedLocalSymbols, JSUnusedGlobalSymbols
class NotificationApiConst {
    static PREFIX_KEY_NOTIFICATION = "notification_";
    static KEY_NOTIFICATION_API = this.PREFIX_KEY_NOTIFICATION + "api";
    static KEY_NOTIFICATION_DATA = this.PREFIX_KEY_NOTIFICATION + "data";
    static KEY_NOTIFICATION_KEY = this.PREFIX_KEY_NOTIFICATION + "key";

    static KEY_NOTIFICATION_ACTION_INDEX = this.PREFIX_KEY_NOTIFICATION + "action_index";
    static KEY_NOTIFICATION_HASHCODE = this.PREFIX_KEY_NOTIFICATION + "hashcode";

    static KEY_NOTIFICATION_HAS_INPUT = this.PREFIX_KEY_NOTIFICATION + "has_input";
    static KEY_NOTIFICATION_KEY_INPUT = this.PREFIX_KEY_NOTIFICATION + "key_input";
    static KEY_NOTIFICATION_DATA_INPUT = this.PREFIX_KEY_NOTIFICATION + "data_input";
}

class NotificationData {
    postTime;
    key;
    appPackage;
    appName;
    title;
    message;
    priority;
    actions;
    smallIcon;
    bigIcon;
    bigPicture;

    static parseFrom(raw) {
        let obj = JSON.parse(raw)
        let data = new NotificationData()

        data.postTime = obj.postTime
        data.key = obj.key
        data.appPackage = obj.appPackage
        data.appName = obj.appName
        data.title = obj.title
        data.message = obj.message
        data.priority = obj.priority
        data.smallIcon = obj.smallIcon
        data.bigIcon = obj.bigIcon
        data.bigPicture = obj.bigPicture

        data.actions = []
        if(obj.actions.length > 0) {
            for(let actionRawItem of obj.actions) {
                data.actions.push(NotificationAction.parseFrom(actionRawItem))
            }
        }

        return data
    }
}

class NotificationAction {
    actionName;
    isInputAction;
    inputResultKey;
    inputLabel;

    static parseFrom(raw) {
        let obj = (raw instanceof Object) ? raw : JSON.parse(raw)
        let data = new NotificationAction()

        data.actionName = obj.actionName
        data.isInputAction = obj.isInputAction
        data.inputResultKey = obj.inputResultKey
        data.inputLabel = obj.inputLabel

        return data
    }
}

async function getPicture(object) {
    return await decompressString(object)
}

module.exports = {
    NotificationApiConst,
    NotificationData,
    NotificationAction,
    getPicture
}