const {requestLiveNotiData, REQUEST_NOTIFICATION_ACTION} = require('./liveNotiProcess')
const ArrayList = require('arraylist-js')
const {postRestApi} = require("syncprotocol/src/PostRequset");
const {BackendConst} = require("syncprotocol/src/BackendProcess");
const {getPicture} = require("../NotificationData");
const {getBackgroundColor} = require("../randColor");

let currentNotificationList = null;
let currentListViewHtmlList = null;
let currentDeviceInfo = null;

async function onLiveNotificationDialogUp(deviceInfo) {
    const liveNotificationInfoLayout = getElement("liveNotificationInfoLayout")
    const liveNotificationModal = getElement("liveNotificationModal")
    const liveNotificationProgress = getElement("liveNotificationProgress")
    const liveNotificationList = getElement("liveNotificationList")

    liveNotificationInfoLayout.style.display = "block"
    liveNotificationInfoLayout.innerHTML = "Uploading live notifications\nfrom target device..."

    liveNotificationModal.style.display = "block"
    liveNotificationProgress.style.display = "block"
    liveNotificationList.innerHTML = ''
    currentDeviceInfo = deviceInfo;

    await requestLiveNotiData(deviceInfo, (result, list) => {
        liveNotificationProgress.style.display = "none"
        liveNotificationInfoLayout.style.display = "none"

        if (result === true) {
            currentNotificationList = new ArrayList()
            currentNotificationList.create(list)

            if (global.globalOption.printDebugLog) {
                console.log(currentNotificationList);
            }
            renderLiveNoti()
        } else {
            liveNotificationInfoLayout.innerHTML += 'Error!';
        }
    })
}

async function onDismissItemClick(notificationKey) {
    let notificationData
    for (let i = 0; i < currentNotificationList.size(); i += 1) {
        notificationData = currentNotificationList.get(i)
        if (notificationData.key === notificationKey) {
            break
        }

        notificationData = null
    }
    if (notificationData == null) {
        throw new Error("Valid notificationData not found!")
    }

    let responsePacket = {
        "type": "pair|live_notification",
        "device_name": global.globalOption.deviceName,
        "device_id": global.globalOption.identifierValue,
        "send_device_name": currentDeviceInfo.deviceName,
        "send_device_id": currentDeviceInfo.deviceId,
        "start_remote_activity": "false",
        "notification_key": notificationData.key,
    }

    responsePacket[BackendConst.KEY_ACTION_TYPE] = REQUEST_NOTIFICATION_ACTION
    postRestApi(responsePacket)

    currentListViewHtmlList.removeByIndex(currentNotificationList.indexOf(notificationData))
    currentNotificationList.removeByObject(notificationData)
    await showRenderLiveNotiList()
}

async function renderLiveNoti() {
    currentListViewHtmlList = new ArrayList()
    for (let i = 0; i < currentNotificationList.size(); i++) {
        let notificationData = currentNotificationList.get(i)
        let notificationImage = await getPicture(notificationData.smallIcon)

        const embeddedCode = 'const {onDismissItemClick} = require(\'./liveNoti/liveNotiDialog\'); onDismissItemClick(\'' + notificationData.key + '\')'
        currentListViewHtmlList.add('<li class="mdl-list__item" style="height: 65px; width: 100%:">\n' +
            '                     <div class="device_icon_background" style="background-color: ' + getBackgroundColor(notificationData.key) +
            '                                                                  ; display: flex; justify-content: center; align-items: center;">\n' +
            '                           <img src="data:image/png;base64,' + notificationImage + '" width="30" height="30" alt=""/>' + '\n' +
            '                     </div>\n' +
            '                       <div style="line-height: 20px; display: inline-block; margin-left:10px" class="mdl-list__item-primary-content">\n' +
            '                        <i style="font-size: 16px;font-style: normal">' + notificationData.title + '</i>\n' +
            '                        <br>\n' +
            '                        <label style="font-size: 12px;font-style: normal">' + notificationData.message + '</label>\n' +
            '                    </div>' +
            '                    <span class="mdl-list__item-secondary-action">\n' +
            '                         <a class="icon material-icons" onclick="' + embeddedCode + '" id="id_' + i + '" href="#" style="text-decoration:none;">close</a>\n' +
            '                    </span>\n' +
            '                </li>')
    }

    await showRenderLiveNotiList()
}

async function showRenderLiveNotiList() {
    const liveNotificationList = getElement("liveNotificationList")
    const liveNotificationInfoLayout = getElement("liveNotificationInfoLayout")
    liveNotificationList.innerHTML = ''

    if (currentListViewHtmlList.size() > 0) {
        liveNotificationInfoLayout.style.display = "none"
        for (let i = 0; i < currentListViewHtmlList.size(); i += 1) {
            liveNotificationList.innerHTML += currentListViewHtmlList.get(i)
        }
    } else {
        liveNotificationInfoLayout.style.display = "block"
        liveNotificationInfoLayout.innerHTML = 'There are currently no notifications\ndisplayed on your device.'
    }
}

function getElement(name) {
    return document.getElementById(name)
}

module.exports = {
    onLiveNotificationDialogUp,
    onDismissItemClick
}