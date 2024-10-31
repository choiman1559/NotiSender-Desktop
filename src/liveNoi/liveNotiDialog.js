const {requestLiveNotiData} = require('./liveNotiProcess')

async function onLiveNotificationDialogUp(deviceInfo) {
    const liveNotificationModal = getElement("liveNotificationModal")
    const pairProgress = getElement("pairProgress")
    const pairModalList = getElement("pairModalList")

    liveNotificationModal.style.display = "block"

    await requestLiveNotiData(deviceInfo, (result, list) => {
        if (result === true) {
            console.log(list);
        } else {
            console.log(result)
        }
    })
}

function getElement(name) {
    return document.getElementById(name)
}

module.exports = {
    onLiveNotificationDialogUp
}