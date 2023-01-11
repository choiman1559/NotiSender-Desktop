const EventEmitter = require("events")

class onEvent extends EventEmitter {}

function init() {
    global.onEventListener = new onEvent()
}

function getEventListener() {
    return global.onEventListener
}

const EVENT_TYPE = {
    ON_DEVICE_FOUND: "onDeviceFound",
    ON_DEVICE_PAIR_RESULT: "onDevicePairResult",
    ON_DATA_RECEIVED: "onDataReceived"
}

module.exports = {
    init,
    getEventListener,
    EVENT_TYPE
}