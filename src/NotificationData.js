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
        data.actions = obj.actions
        data.smallIcon = obj.smallIcon
        data.bigIcon = obj.bigIcon
        data.bigPicture = obj.bigPicture

        return data
    }
}

module.exports = {
    NotificationData
}