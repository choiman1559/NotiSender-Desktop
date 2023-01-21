class DeviceType extends Object {
    constructor(deviceType) {
        super();
        this.DEVICE_TYPE = deviceType
    }

    getMaterialIconString() {
        if (this.DEVICE_TYPE == null) {
            return "smartphone"
        }

        switch (this.DEVICE_TYPE) {
            case DEVICE_TYPE_PHONE:
                return "smartphone";

            case DEVICE_TYPE_TABLET:
                return "tablet";

            case DEVICE_TYPE_TV:
                return "tv";

            case DEVICE_TYPE_DESKTOP:
                return "desktop_windows";

            case DEVICE_TYPE_LAPTOP:
                return "laptop";

            case DEVICE_TYPE_WATCH:
                return "watch";

            case DEVICE_TYPE_IOT:
                return "home_mini";

            case DEVICE_TYPE_VR:
                return "view_in_vr";

            case DEVICE_TYPE_CAR:
                return "directions_car";

            case DEVICE_TYPE_UNKNOWN:
            default:
                return "devices_other";
        }
    }

    DEVICE_TYPE
}

function getThisDeviceType() {
    let deviceType = new DeviceType(DEVICE_TYPE_UNKNOWN)
    navigator.getBattery().then(function (battery) {
        if (battery == null) {
            deviceType.DEVICE_TYPE = DEVICE_TYPE_UNKNOWN
        } else {
            if (battery.charging && battery.chargingTime === 0 && battery.level === 1) {
                deviceType.DEVICE_TYPE = DEVICE_TYPE_DESKTOP
            } else {
                deviceType.DEVICE_TYPE = DEVICE_TYPE_LAPTOP
            }
        }
    });
    return deviceType
}

const DEVICE_TYPE_UNKNOWN = "Unknown";
const DEVICE_TYPE_PHONE = "Phone";
const DEVICE_TYPE_TABLET = "Tablet";
const DEVICE_TYPE_TV = "Television";
const DEVICE_TYPE_DESKTOP = "Desktop";
const DEVICE_TYPE_LAPTOP = "Laptop";
const DEVICE_TYPE_WATCH = "Smartwatch";
const DEVICE_TYPE_IOT = "IOT_Device";
const DEVICE_TYPE_VR = "VR_Gear";
const DEVICE_TYPE_CAR = "Automobile";

module.exports = {
    DeviceType,
    getThisDeviceType,

    DEVICE_TYPE_UNKNOWN,
    DEVICE_TYPE_PHONE,
    DEVICE_TYPE_TABLET,
    DEVICE_TYPE_TV,
    DEVICE_TYPE_DESKTOP,
    DEVICE_TYPE_LAPTOP,
    DEVICE_TYPE_WATCH,
    DEVICE_TYPE_IOT,
    DEVICE_TYPE_VR,
    DEVICE_TYPE_CAR
}