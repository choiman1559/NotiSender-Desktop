class Device extends Object {
    constructor(name, id) {
        super();
        this.deviceName = name
        this.deviceId = id
    }

    toString(){
        return this.deviceName + "|" + this.deviceId;
    }

    deviceName
    deviceId
}

module.exports = Device