class Device extends Object {
    constructor(name, id) {
        super();
        this.deviceName = name
        this.deviceId = id
    }

    toString() {
        return this.deviceName + "|" + this.deviceId + (this.deviceType == null ? "" : "|" + this.deviceType);
    }

    equals(other) {
        if(!other instanceof Device) return false
        return this.deviceName === other.deviceName && this.deviceId === other.deviceId;
    }

    deviceName
    deviceId
    deviceType
}

function parseDevice(str) {
    const array = str.split("|")
    if(array.length < 2) throw new Error("Invalid device info string, raw data: " + str)

    let device = new Device(array[0], array[1])
    if(array.length >= 3) device.deviceType = array[2]
    return device
}

module.exports = {
    Device,
    parseDevice
}