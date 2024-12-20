const {
    init,
    dataSetChangeListener,
    changeOption
} = require("./protocol");

const fs = require('fs');
const ipcRenderer = require("electron").ipcRenderer;
const webUtils = require("electron").webUtils
const path = require("path");
const Store = require('electron-store');
const store = new Store();

const { initializeApp } = require("firebase/app")
const firebaseConfig = require("./credential/firebase-config.json")
const { getAuth, setPersistence, signInWithCredential, signOut, GoogleAuthProvider } = require("firebase/auth");
const { getStorage, ref, uploadBytes } = require("firebase/storage");

initializeApp(firebaseConfig);
const auth = getAuth();
setPersistence(auth, 'LOCAL').then(_ => {})
const token = getPreferenceValue("login_token", "")
let credential;
if (token !== "") credential = GoogleAuthProvider.credential(token.id_token);

const {
    requestAction,
    sendFindTargetDesignatedNotification,
    removePairedDevice,
    requestRemovePair,
    requestData,
    requestDeviceListWidely, requestPair
} = require("syncprotocol/src/ProcessUtil");

const {
    getBackgroundColor,
    getForegroundColor
} = require("./randColor");

const {
    getEventListener,
    EVENT_TYPE
} = require("syncprotocol/src/Listener");
const { Device } = require("syncprotocol/src/Device");
const { DeviceType, DEVICE_TYPE_UNKNOWN, DEVICE_TYPE_PHONE, DEVICE_TYPE_TABLET, DEVICE_TYPE_DESKTOP, DEVICE_TYPE_LAPTOP} = require("syncprotocol/src/DeviceType");
const { postRestApi } = require("syncprotocol/src/PostRequset");
const {NotificationData} = require("./NotificationData");
const {onLiveNotificationDialogUp} = require("./liveNoti/liveNotiDialog")

const taskSelect = getElement('TaskSelection')
const deviceSelect = getElement("DeviceSelection")

const Args1Form = getElement("Args1Form")
const Args2Form = getElement("Args2Form")
const Args3Form = getElement("Args3Form")

const Args1EditText = getElement("Args1")
const Args2EditText = getElement("Args2")
const Args3EditText = getElement("Args3")

const SubmitButton = getElement("submitButton")

const DeviceList = getElement("deviceList")
const deviceDetail = getElement("deviceDetail")
const emptyDeviceList = getElement("emptyDeviceList")
const pairModalList = getElement("pairModalList")
const pairModal = getElement("pairModal")
const pairProgress = getElement("pairProgress")
const liveNotificationAction = getElement("liveNotificationAction")
const liveNotificationModal = getElement("liveNotificationModal")

const deviceDetailPrefsContainer = getElement("deviceDetailPrefsContainer")
const remoteServiceToggle = getElement("remoteServiceToggle")
const blockNotification = getElement("blockNotification")

const batteryContainer = getElement("batteryContainer")
const batteryIcon = getElement("batteryIcon")
const batteryText = getElement("batteryText")

const enabled = getElement("enabled")
const notificationToggle = getElement("notificationToggle")
const encryptionEnabled = getElement("encryptionEnabled")
const encryptionPassword = getElement("encryptionPassword")
const showPassword = getElement("showPassword")
const alwaysEncrypt = getElement("alwaysEncrypt")
const allowOnlyPaired = getElement("allowOnlyPaired")
const useHMAC = getElement("useHMAC")
const printDebugLog = getElement("printDebugLog")
const showAlreadyConnected = getElement("showAlreadyConnected")
const allowRemovePairRemotely = getElement("allowRemovePairRemotely")
const startWhenBoot = getElement("startWhenBoot")
const enforceBackendProxy = getElement("enforceBackendProxy")
const useRemoteDismiss = getElement("useRemoteDismiss")

const version = getElement("version")
const LoginInfoDetail = getElement("LoginInfoDetail")
const LoginInfoTitle = getElement("LoginInfoTitle")
const LoginButton = getElement("LoginButton")

const loginTokenExpireModal = getElement("loginTokenExpireModal")
const loginTokenExpireText = getElement("loginTokenExpireText")
const loginTokenExpireTitle = getElement("loginTokenExpireTitle")

const notificationDetailModal = getElement("notificationDetailModal")
const notificationDetailTitle = getElement("notificationDetailTitle")
const notificationDetailText = getElement("notificationDetailText")
const remoteRunButton = getElement("remoteRunButton")
const smsReplyMessageContainer = getElement("smsReplyMessageContainer")
const smsReplyMessageValue = getElement("smsReplyMessageValue")

const deadlineTime = getElement("deadlineTime")
const deadlineTimeValue = getElement("deadlineTimeValue")

SubmitButton.disabled = true

const deviceList = []
let deviceListIndex = 0
let modalSelectedDevice
let lastSelectedFilePath = ""

let pairDeviceList = []
let pairDeviceListIndex = 0
let pairModalSelectedDevice

function loadDeviceList() {
    while (deviceList.length) deviceList.pop()
    deviceListIndex = 0

    emptyDeviceList.style.display = "none"
    deviceSelect.innerHTML = '<option value="0">Select Device</option>'
    DeviceList.innerHTML = ""

    let value = [];
    if (store.has("paired_list")) {
        value = JSON.parse(store.get("paired_list"))
        if (value.length > 0) for (let i = 0; i < value.length; i++) {
            const arr = value[i].split("|")
            let device = new Device(arr[0], arr[1])
            let deviceType = new DeviceType(DEVICE_TYPE_UNKNOWN)
            if (arr.length >= 3) {
                deviceType = new DeviceType(arr[2])
                device.deviceType = deviceType
            }

            deviceList.push(device)
            deviceSelect.add(new Option(arr[0]))
            DeviceList.innerHTML += '<li class="mdl-list__item" style="height: 65px">\n' +
                '                     <div class="device_icon_background" style="background-color: ' + getBackgroundColor(arr[0]) + '">\n' +
                '                           <i class="device_icon_text material-icons" style="color: ' + getForegroundColor(arr[0]) + '">' + deviceType.getMaterialIconString() + '</i>' +
                '                     </div>\n' +
                '                    <span class="mdl-list__item-primary-content">\n' +
                '                       &nbsp;&nbsp;&nbsp;' + arr[0] + '\n' +
                '                    </span>\n' +
                '                    <span class="mdl-list__item-secondary-action">\n' +
                '                         <a class="icon material-icons" onclick="onDeviceItemClick(this.id)" id="device' + deviceListIndex + '" href="#" style="text-decoration:none;">settings</a>\n' +
                '                    </span>\n' +
                '                </li>'
            deviceListIndex += 1;
        } else showEmptyDeviceList()
    } else showEmptyDeviceList()
}

function showEmptyDeviceList() {
    console.log("blocker")
    emptyDeviceList.style.display = "block"
}

loadDeviceList()
dataSetChangeListener.on("changed", function () {
    loadDeviceList()
})

function onTaskSelected() {
    SubmitButton.disabled = (taskSelect.value === "0" || deviceSelect.value === "0")

    switch (taskSelect.value) {
        case "1":
            Args1Form.style.display = "block"
            Args2Form.style.display = "block"
            Args3Form.style.display = "none"

            getElement("Args1Text").innerText = "Notification Title"
            getElement("Args2Text").innerText = "Notification Content"
            break;

        case "2":
            Args1Form.style.display = "block"
            Args2Form.style.display = "none"
            Args3Form.style.display = "none"

            getElement("Args1Text").innerText = "Text to send"
            break;

        case "3":
            Args1Form.style.display = "block"
            Args2Form.style.display = "none"
            Args3Form.style.display = "none"

            getElement("Args1Text").innerText = "Url to open in browser"
            break;

        case "4":
            Args1Form.style.display = "none"
            Args2Form.style.display = "none"
            Args3Form.style.display = "none"
            break;

        case "5":
            Args1Form.style.display = "block"
            Args2Form.style.display = "none"
            Args3Form.style.display = "none"

            getElement("Args1Text").innerText = "app's package name to open"
            break;

        case "6":
            Args1Form.style.display = "block"
            Args2Form.style.display = "none"
            Args3Form.style.display = "none"

            getElement("Args1Text").innerText = "Type terminal command to run"
            break;

        case "7":
            Args1Form.style.display = "none"
            Args2Form.style.display = "none"
            Args3Form.style.display = "block"
            break;

        default:
            Args1Form.style.display = "none"
            Args2Form.style.display = "none"
            Args3Form.style.display = "none"
            break;
    }
}

// noinspection JSUnusedLocalSymbols
function onDeviceSelected() {
    SubmitButton.disabled = (taskSelect.value === "0" || deviceSelect.value === "0")

    if(deviceSelect.value !== "0") {
        const selectedDevice = deviceList[deviceSelect.selectedIndex - 1]
        switch (selectedDevice.deviceType.DEVICE_TYPE) {
            case DEVICE_TYPE_PHONE:
            case DEVICE_TYPE_TABLET:
                liveNotificationAction.disabled = false
                break;

            case DEVICE_TYPE_DESKTOP:
            case DEVICE_TYPE_LAPTOP:
                liveNotificationAction.disabled = true
                //TODO: Implement Remote file Explorer
                break;

            default:
                liveNotificationAction.disabled = true
                break;
        }
    } else liveNotificationAction.disabled = true
}

// noinspection JSUnusedLocalSymbols
function showLiveNotificationDialog() {
    const selectedDevice = deviceList[deviceSelect.selectedIndex - 1];
    onLiveNotificationDialogUp(selectedDevice).then(_ => { })
}

// noinspection JSUnusedLocalSymbols
function onClickSubmit() {
    let isArgs1Visible = Args1Form.style.display === "block"
    let isArgs2Visible = Args2Form.style.display === "block"
    let isArgs3Visible = Args3Form.style.display === "block"

    if (isArgs1Visible && isArgs2Visible) {
        requestAction(deviceList[deviceSelect.selectedIndex - 1], taskSelect.options[taskSelect.value].text, Args1EditText.value.trim(), Args2EditText.value.trim())
        resetTextField()
    } else if (isArgs1Visible) {
        requestAction(deviceList[deviceSelect.selectedIndex - 1], taskSelect.options[taskSelect.value].text, Args1EditText.value.trim())
        resetTextField()
    } else if (isArgs3Visible) {
        if (lastSelectedFilePath === "") {
            createToastNotification('Please select file first', 'Okay')
        } else {
            resetTextField()
            let fileFoo = lastSelectedFilePath.split(lastSelectedFilePath.indexOf("\\") > -1 ? "\\" : "/")
            let fileName = fileFoo[fileFoo.length - 1]

            new Notification("Uploading File", {
                body: "Upload Started: " + fileName,
                icon: path.join(__dirname, '/res/icon.png'),
            })

            fs.readFile(lastSelectedFilePath, (_, data) => {
                const storage = getStorage()
                const pathReference = ref(storage, global.globalOption.pairingKey + '/fileTransfer/' + fileName)
                lastSelectedFilePath = ""

                if (data.byteLength <= 104857600) {
                    uploadBytes(pathReference, data).then((_) => {
                        requestAction(deviceList[deviceSelect.selectedIndex - 1], "Share file", fileName)
                        new Notification("Upload completed", {
                            body: "File upload completed: " + fileName + "\nFile will be downloaded on target device automatically",
                            icon: path.join(__dirname, '/res/icon.png'),
                        })
                    });
                } else {
                    new Notification("Upload failed", {
                        body: "File upload failed: " + fileName + "\nFile is too big to be uploaded, limit is 100MB",
                        icon: path.join(__dirname, '/res/icon.png'),
                    })
                }
            })
        }
    } else {
        requestAction(deviceList[deviceSelect.selectedIndex - 1], taskSelect.options[taskSelect.value].text)
        resetTextField()
    }
}

function resetTextField() {
    createToastNotification('Your request has been transmitted!', 'Okay')
    Args1EditText.value = ""
    Args2EditText.value = ""
    Args3EditText.value = ""
}

function createToastNotification(message, action) {
    const data = {
        message: message,
        timeout: 2000,
        actionText: action
    };

    const snackbarDom = document.querySelector('#snackbar')
    snackbarDom.MaterialSnackbar.showSnackbar(data);
}

function onDeviceItemClick(index) {
    modalSelectedDevice = deviceList[index.replace("device", "")]
    getElement("deviceTag").innerHTML =
        '                     <div class="device_icon_background" style="background-color: ' + getBackgroundColor(modalSelectedDevice.deviceName) + '">\n' +
        '                           <i class="device_icon_text material-icons" style="color: ' + getForegroundColor(modalSelectedDevice.deviceName) + '">' + modalSelectedDevice.deviceType.getMaterialIconString() + '</i>' +
        '                    </div><br>\n' +
        '                    <span class="mdl-list__item-primary-content name_style">' + modalSelectedDevice.deviceName + '\n' +
        '                    </span><br>'

    deviceDetail.style.display = "block"
    deviceDetailPrefsContainer.style.display = "block"
    remoteServiceToggle.parentElement.style.display = "none"
    batteryContainer.style.display = "none"

    requestData(modalSelectedDevice, "battery_info")
    getEventListener().on(EVENT_TYPE.ON_DATA_RECEIVED, function (data) {
        let dataArray = data.receive_data.split("|")
        batteryContainer.style.display = "flex"
        batteryText.innerText = dataArray[0] + "% remaining" + (dataArray[1] === "true" ? ", Charging" : "")

        if (dataArray[1] === "true") batteryIcon.innerText = "battery_charging_full"
        else {
            let batteryCalculatedLevel = Math.floor(dataArray[0] / 14.28)
            if (batteryCalculatedLevel >= 7) batteryIcon.innerText = "battery_full"
            else batteryIcon.innerText = "battery_" + batteryCalculatedLevel + "_bar"
        }

        if(store.get("notificationBlackList", []).includes(modalSelectedDevice.deviceId)) {
            blockNotification.parentElement.classList.add("is-checked")
            blockNotification.checked = true
        }

        blockNotification.onchange = () => {
            let notificationBlackList = store.get("notificationBlackList", [])
            if(blockNotification.checked) {
                if(!notificationBlackList.includes(modalSelectedDevice.deviceId)) {
                    notificationBlackList.push(modalSelectedDevice.deviceId)
                }
            } else if(notificationBlackList.includes(modalSelectedDevice.deviceId)) {
                notificationBlackList = notificationBlackList.filter(item => item !== modalSelectedDevice.deviceId)
            }
            store.set("notificationBlackList", notificationBlackList)
        }

        if(dataArray.length >= 4) {
            if("true" === dataArray[3]) {
                remoteServiceToggle.parentElement.classList.add("is-checked")
                remoteServiceToggle.checked = true
            }

            remoteServiceToggle.parentElement.style.display = "block"
            remoteServiceToggle.onchange = () => {
                requestAction(modalSelectedDevice, "toggle_service", remoteServiceToggle.checked.toString())
            }
        }
    })
}

// noinspection JSUnusedLocalSymbols
function onFileSelect() {
    ipcRenderer.send("file_select_dialog")
}

// noinspection JSUnusedLocalSymbols
function onFindButtonClick() {
    sendFindTargetDesignatedNotification(modalSelectedDevice)
}

// noinspection JSUnusedLocalSymbols
function onForgetButtonClick() {
    removePairedDevice(modalSelectedDevice)
    requestRemovePair(modalSelectedDevice)
    onModalCloseClick()
    loadDeviceList()
}

// noinspection JSUnusedLocalSymbols
function onAddButtonClick() {
    if (getPreferenceValue("login_token", "") === "") {
        createToastNotification('Please login first', 'Okay')
    } else {
        pairModal.style.display = "block"
        pairProgress.style.display = "block"
        while (pairDeviceList.length) pairDeviceList.pop()
        pairDeviceListIndex = 0
        pairModalList.innerHTML = ""

        requestDeviceListWidely()
        getEventListener().on(EVENT_TYPE.ON_DEVICE_FOUND, function (device) {
            if (pairDeviceList.indexOf(device) === -1) {
                let deviceIcon = device.deviceType === undefined ? "devices_other" : new DeviceType(device.deviceType).getMaterialIconString()
                pairModalList.innerHTML += '<li class="mdl-list__item" style="height: 65px" onclick="onPairDeviceItemClick(this.id)" id="pairDevice' + pairDeviceListIndex + '">\n' +
                    '                     <div class="device_icon_background" style="background-color: ' + getBackgroundColor(device.deviceName) + '">\n' +
                    '                           <i class="device_icon_text material-icons" style="color: ' + getForegroundColor(device.deviceName) + '">' + deviceIcon + '</i>' +
                    '                     </div>\n' +
                    '                    <span class="mdl-list__item-primary-content">\n' +
                    '                       &nbsp;' + device.deviceName + '\n' +
                    '                    </span>\n' +
                    '                     <span class="mdl-list__item-secondary-content" id="pairDeviceStatus' + pairDeviceListIndex + '" style="font-size: 12px"></span>\n' +
                    '                </li>'

                pairDeviceList.push(device)
                pairDeviceListIndex += 1;
            }
        })
    }
}

function onPairDeviceItemClick(index) {
    let statusText = getElement(index.replace("pairDevice", "pairDeviceStatus"))
    pairModalSelectedDevice = pairDeviceList[index.replace("pairDevice", "")]
    statusText.innerText = "Connecting..."
    pairProgress.style.display = "none"

    requestPair(pairModalSelectedDevice)
    getEventListener().on(EVENT_TYPE.ON_DEVICE_PAIR_RESULT, function (map) {
        if (map.pair_accept === "true") {
            dataSetChangeListener.emit("changed")
            onModalCloseClick()
            createToastNotification("Device Connected!", "OK")
        } else {
            statusText.innerText = "Failed"
        }
    })
}

function onModalCloseClick() {
    deviceDetail.style.display = "none"
    pairModal.style.display = "none"
    notificationDetailModal.style.display = "none"
    loginTokenExpireModal.style.display = "none"
    liveNotificationModal.style.display = "none"
}

window.onclick = function (event) {
    if (event.target === deviceDetail) {
        deviceDetail.style.display = "none";
    }

    if (event.target === pairModal) {
        pairModal.style.display = "none";
    }
}

function getElement(name) {
    return document.getElementById(name)
}

function getPreferenceValue(key, defValue) {
    const value = store.get(key)
    return value == null ? defValue : value
}

enabled.checked = getPreferenceValue("enabled", true)
notificationToggle.checked = getPreferenceValue("notificationToggle", true)
encryptionEnabled.checked = getPreferenceValue("encryptionEnabled", false)
alwaysEncrypt.checked = getPreferenceValue("alwaysEncrypt", true)
useHMAC.checked = getPreferenceValue("useHMAC", false)
allowOnlyPaired.checked = getPreferenceValue("allowOnlyPaired", false)
encryptionPassword.value = getPreferenceValue("encryptionPassword", "")
deadlineTime.checked = getPreferenceValue("deadlineTime", false)
deadlineTimeValue.value = getPreferenceValue("deadlineTimeValue", "")
printDebugLog.checked = getPreferenceValue("printDebugLog", false)
showAlreadyConnected.checked = getPreferenceValue("showAlreadyConnected", false)
allowRemovePairRemotely.checked = getPreferenceValue("allowRemovePairRemotely", true)
startWhenBoot.checked = getPreferenceValue("startWhenBoot", true)
enforceBackendProxy.checked = getPreferenceValue("enforceBackendProxy", false)
useRemoteDismiss.checked = getPreferenceValue("useRemoteDismiss", true)

showPassword.addEventListener("click", function () {
    this.classList.toggle("fa-eye-slash")
    const type = encryptionPassword.getAttribute("type") === "password" ? "text" : "password"
    encryptionPassword.setAttribute("type", type)
})

dataSetChangeListener.on("notificationToggle", function (value) {
    notificationToggle.checked = value
    if(value) {
        notificationToggle.parentElement.classList.add("is-checked")
    } else {
        notificationToggle.parentElement.classList.remove("is-checked")
    }
})

// noinspection JSUnusedLocalSymbols
function onValueChanged(id, type) {
    store.set(id, type === "checked" ? getElement(id).checked : getElement(id).value)
    changeOption()
}

function initAuth() {
    function showLoginModal(title, message) {
        ipcRenderer.send("show_window")
        setPanelActive(1)

        loginTokenExpireTitle.innerText = title
        loginTokenExpireText.innerText = message
        loginTokenExpireModal.style.display = "block"
    }

    const loginToken = getPreferenceValue("login_token", "")
    const isLogin = loginToken !== ""
    if (isLogin) {
        LoginInfoTitle.innerText = "Service Enabled"
        LoginInfoDetail.innerText = "Logined as " + getPreferenceValue("userEmail", "")
        LoginButton.innerText = "Logout"

        if(Date.now() >= loginToken.expiry_date) {
            resetAuth()
            showLoginModal("Login Session Expired", "Your account is log-out. Please login again.")
        } else {
            credential = GoogleAuthProvider.credential(loginToken.id_token);
            signInWithCredential(auth, credential).then((_) => {
                const isDesignDebugMode = false
                if (!isDesignDebugMode) init()
            })
        }
    } else {
        LoginInfoTitle.innerText = "Login Required"
        LoginInfoDetail.innerText = "Service will be unavailable until login"
        LoginButton.innerText = "Login"
        showLoginModal("Login Required", "Account is not connected to application.")
    }
}

// noinspection JSUnusedLocalSymbols
function onRefreshAuth() {
    onAuth()
    onModalCloseClick()
    setPanelActive(3)
}

function onAuth() {
    if (getPreferenceValue("login_token", "") === "") {
        ipcRenderer.send("login_request")
    } else {
        signOut(auth).then(() => {
            createToastNotification('Logout Succeeded', 'Okay')
            resetAuth()
            initAuth()
        }).catch((error) => {
            console.log(error)
            createToastNotification('Logout failed: ' + error.errorMessage, 'Okay')
        });
    }
}

function resetAuth() {
    store.delete("pairingKey")
    store.delete("userEmail")
    store.delete("login_token")
    changeOption(false)
}

initAuth()
ipcRenderer.on("login_complete", (_, token) => {
    credential = GoogleAuthProvider.credential(token.id_token);
    signInWithCredential(auth, credential)
        .then((result) => {
            const userEmail = result.user.email;
            const userId = result.user.uid;

            store.set("pairingKey", userId)
            store.set("userEmail", userEmail)

            initAuth()
            createToastNotification('Login Succeeded', 'Okay')
            changeOption(true)
        }).catch((error) => {
            const errorMessage = error.message;
            console.log(error)

            createToastNotification('Login failed: ' + errorMessage, 'Okay')
        });
})

ipcRenderer.on("file_select_dialog_result", (_, result) => {
    if (result !== null) {
        lastSelectedFilePath = result
        let fileFoo = result.split(result.indexOf("\\") > -1 ? "\\" : "/")
        Args3EditText.value = fileFoo[fileFoo.length - 1]
        setEditTextDirty(3)
    }
})

ipcRenderer.send("version_request")
ipcRenderer.on("version_info", (_, versionInfo) => {
    version.innerText = "Version " + versionInfo
})

ipcRenderer.on("notification_detail", (_, map) => {
    const nickname = (map.nickname === undefined || map.nickname === '' ? "" : " (" + map.nickname + ")")
    setPanelActive(1)
    notificationDetailModal.style.display = "block"
    deviceDetailPrefsContainer.style.display = "none"
    remoteRunButton.onclick = function () {
        onClickRemoteRunButton(map)
    }

    switch (map.type) {
        case "send|normal":
            const notificationData = NotificationData.parseFrom(map.notification_data);
            let date = new Date(notificationData.postTime);

            smsReplyMessageContainer.style.display = "none"
            smsReplyMessageValue.value = ""
            notificationDetailTitle.innerText = notificationData.appName
            remoteRunButton.innerText = "Remote Run"
            notificationDetailText.innerHTML =
                "<b>Title: </b>" + notificationData.title + "<br>" +
                "<b>Content: </b>" + notificationData.message + "<br>" +
                "<b>Device: </b>" + map.device_name + "<br>" +
                "<b>Posted Time: </b>" + date.toLocaleDateString("en-US") + ' ' + date.toLocaleTimeString("en-US") + "<br>"
            break;

        case "send|sms":
            smsReplyMessageContainer.style.display = "block"
            smsReplyMessageValue.value = ""
            remoteRunButton.innerText = "Reply"

            notificationDetailTitle.innerText = "Sms Overview"
            notificationDetailText.innerHTML =
                "<b>From: </b>" + map.address + nickname + "<br>" +
                "<b>Message: </b>" + map.message + "<br>" +
                "<b>Device: </b>" + map.device_name + "<br>" +
                "<b>Posted Time: </b>" + map.date + "<br>"
            break;

        case "send|telecom":
            smsReplyMessageContainer.style.display = "block"
            smsReplyMessageValue.value = ""
            remoteRunButton.innerText = "Reply"

            notificationDetailTitle.innerText = "Call Overview"
            notificationDetailText.innerHTML =
                "<b>From: </b>" + map.address + nickname + "<br>" +
                "<b>Device: </b>" + map.device_name + "<br>" +
                "<b>Posted Time: </b>" + map.date + "<br>"
            break;
    }
});

function onClickRemoteRunButton(map) {
    let data

    switch (map.type) {
        case "send|normal":
            onModalCloseClick()
            data = {
                "type": "reception|normal",
                "package": NotificationData.parseFrom(map.notification_data).appPackage,
                "device_name": global.globalOption.deviceName,
                "device_id": global.globalOption.identifierValue,
                "send_device_name": map.device_name,
                "send_device_id": map.device_id,
            }
            break;

        case "send|sms":
        case "send|telecom":
            if (smsReplyMessageValue.value === "") return
            onModalCloseClick()
            data = {
                "type": "reception|sms",
                "address": map.address,
                "nickname": map.nickname,
                "message": smsReplyMessageValue.value,
                "device_name": global.globalOption.deviceName,
                "device_id": global.globalOption.identifierValue,
                "send_device_name": map.device_name,
                "send_device_id": map.device_id,
            }
            break;
    }

    postRestApi(data)
    createToastNotification("Your request has been transmitted!", 'Okay')
}

document.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if(event.dataTransfer.files.length > 0) {
        setPanelActive(2)
        taskSelect.value = 7
        onTaskSelected()

        if(event.dataTransfer.files.length > 1) {
            createToastNotification("Only one file can be transferred at a time.", "Okay")
        }

        const draggedFile = webUtils.getPathForFile(event.dataTransfer.files[0])
        lastSelectedFilePath = draggedFile

        let fileFoo = draggedFile.split(draggedFile.indexOf("\\") > -1 ? "\\" : "/")
        Args3EditText.value = fileFoo[fileFoo.length - 1]
        setEditTextDirty(3)
    } else if(event.dataTransfer.types.indexOf("text/uri-list") > -1) {
        event.dataTransfer.items[1].getAsString((data) => {
            data = data.split("\r\n")[0]
            if(data.startsWith("http")) {
                setPanelActive(2)
                taskSelect.value = 3
                onTaskSelected()
                Args1EditText.value = data
                setEditTextDirty(1)
            }
        })
    } else if(event.dataTransfer.types.indexOf("text/plain") > -1) {
        event.dataTransfer.items[0].getAsString((data) => {
            setPanelActive(2)

            if(data.startsWith("http")) {
                taskSelect.value = 3
            } else {
                taskSelect.value = 2
            }

            Args1EditText.value = data
            setEditTextDirty(1)
            onTaskSelected()
        })
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

function setEditTextDirty(which) {
    const dirtyClassValue = "is-dirty"
    let div = getElement("ArgsDiv" + which)
    div.classList.add(dirtyClassValue)
}

function setPanelActive(which) {
    const activeClassValue = "is-active"

    for(let i = 1; i <= 3;i++) {
        let tabPanel = getElement("fixed-tab-" + i)
        let tabBar = getElement("fixed-bar-" + i)

        if(i === which) {
            tabPanel.classList.add(activeClassValue)
            tabBar.classList.add(activeClassValue)
        } else {
            tabPanel.classList.remove(activeClassValue)
            tabBar.classList.remove(activeClassValue)
        }
    }
}
