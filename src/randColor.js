const material_color_low = [
    "#FFCDD2",
    "#F8BBD0",
    "#E1BEE7",
    "#D1C4E9",
    "#C5CAE9",
    "#BBDEFB",
    "#B3E5FC",
    "#B2EBF2",
    "#B2DFDB",
    "#C8E6C9",
    "#DCEDC8",
    "#F0F4C3",
    "#FFF9C4",
    "#FFECB3",
    "#FFE0B2",
    "#FFCCBC",
    "#D7CCC8",
    "#CFD8DC"
]

const material_color_high = [
    "#F44336",
    "#E91E63",
    "#9C27B0",
    "#673AB7",
    "#3F51B5",
    "#2196F3",
    "#03A9F4",
    "#00BCD4",
    "#009688",
    "#4CAF50",
    "#8BC34A",
    "#CDDC39",
    "#FFEB3B",
    "#FFC107",
    "#FF9800",
    "#FF5722",
    "#795548",
    "#607D8B"
]

function getRandIndex(string) {
    let hash = 0
    for (let i = 0; i < string.length; i++) {
        let code = string.charCodeAt(i)
        hash = ((hash << 5) - hash) + code
        hash = hash & hash;
    }

    let t = hash + 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function getBackgroundColor(name) {
    return material_color_low[Math.trunc(getRandIndex(name) * 17)]
}

function getForegroundColor(name) {
    return material_color_high[Math.trunc(getRandIndex(name) * 17)]
}

module.exports = {
    getBackgroundColor,
    getForegroundColor
}