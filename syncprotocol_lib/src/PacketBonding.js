const ArrayList = require("arraylist-js")
const {scheduleJob} = require("node-schedule");
const {BackendConst} = require("./BackendProcess");

class PacketBonding {

    static DEFAULT_DELAY = 300
    static lastScheduleStartTime

    static packetList = new ArrayList()
    static scheduledFuture
    static scheduleCompletedCallback

    static runBondingSchedule(data, callback) {
        function getTime() {
            return new Date().getTime()
        }

        if (this.lastScheduleStartTime !== undefined && this.scheduledFuture !== undefined
            && getTime() - this.lastScheduleStartTime < 0) {
            this.scheduledFuture.cancel()
        }

        this.packetList.add(data)
        this.scheduleCompletedCallback = callback
        this.lastScheduleStartTime = getTime() + this.DEFAULT_DELAY
        this.scheduledFuture = scheduleJob(this.lastScheduleStartTime, function () {
            PacketBonding.sendBondingArrayNow()
        });
    }

    static sendBondingArrayNow() {
        if(this.packetList.size() > 1) {
            let bondingPacket = {"type": BackendConst.SERVICE_TYPE_PACKET_BONDING}
            bondingPacket[BackendConst.KEY_PACKET_BONDING_ARRAY] = JSON.stringify(this.packetList.list)
            bondingPacket[BackendConst.KEY_DEVICE_NAME] = global.globalOption.deviceName
            bondingPacket[BackendConst.KEY_DEVICE_ID] = global.globalOption.identifierValue
            this.scheduleCompletedCallback(bondingPacket)
        } else {
            this.scheduleCompletedCallback(this.packetList.list[0])
        }
        this.packetList.clear()
    }
}

module.exports = {
    PacketBonding
}