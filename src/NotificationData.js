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

module.exports = {
    NotificationData,
    NotificationAction
}