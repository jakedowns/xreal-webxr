// light demo upgrade
const HEAD = 0x02;
let pn = 1; // PN

export const NREAL_VENDOR_ID = 0x0483;
export const BOOT_PRODUCT_ID = 0x5740;


export const MESSAGES = {
    W_CANCEL_ACTIVATION: 0x19,
    R_MCU_APP_FW_VERSION: 0x35,//MCU APP FW version.
    R_ACTIVATION_TIME: 0x66,//Read activation time
    W_ACTIVATION_TIME: 0x2A,//Write activation time

    W_UPDATE_MCU_APP_FW_PREPARE: 0x3E,//Preparations for mcu app fw upgrade
    W_UPDATE_MCU_APP_FW_START: 0x39,	//(Implemented in APP A)
    W_UPDATE_MCU_APP_FW_TRANSMIT: 0x40,	//(Implemented in APP A)
    W_UPDATE_MCU_APP_FW_FINISH: 0x41,	//(Implemented in APP A)
    W_BOOT_JUMP_TO_APP: 0x42,	//(Implemented in APP A)
    W_MCU_APP_JUMP_TO_BOOT: 0x38,   //Jump into APP A

    W_BOOT_UPDATE_MODE: 0x1100,
    W_BOOT_UPDATE_CONFIRM: 0x1101,
    W_BOOT_UPDATE_PREPARE: 0x1102,

    W_BOOT_UPDATE_START: 0x1103,
    W_BOOT_UPDATE_TRANSMIT: 0x1104,
    W_BOOT_UPDATE_FINISH: 0x1105,
};



const crc16_table = [
    0, 4129, 8258, 12387, 16516, 20645, 24774, 28903, 33032, 37161, 41290, 45419, 49548, 53677,
    57806, 61935, 4657, 528, 12915, 8786, 21173, 17044, 29431, 25302, 37689, 33560, 45947, 41818,
    54205, 50076, 62463, 58334, 9314, 13379, 1056, 5121, 25830, 29895, 17572, 21637, 42346, 46411,
    34088, 38153, 58862, 62927, 50604, 54669, 13907, 9842, 5649, 1584, 30423, 26358, 22165, 18100,
    46939, 42874, 38681, 34616, 63455, 59390, 55197, 51132, 18628, 22757, 26758, 30887, 2112, 6241,
    10242, 14371, 51660, 55789, 59790, 63919, 35144, 39273, 43274, 47403, 23285, 19156, 31415,
    27286, 6769, 2640, 14899, 10770, 56317, 52188, 64447, 60318, 39801, 35672, 47931, 43802, 27814,
    31879, 19684, 23749, 11298, 15363, 3168, 7233, 60846, 64911, 52716, 56781, 44330, 48395, 36200,
    40265, 32407, 28342, 24277, 20212, 15891, 11826, 7761, 3696, 65439, 61374, 57309, 53244, 48923,
    44858, 40793, 36728, 37256, 33193, 45514, 41451, 53516, 49453, 61774, 57711, 4224, 161, 12482,
    8419, 20484, 16421, 28742, 24679, 33721, 37784, 41979, 46042, 49981, 54044, 58239, 62302, 689,
    4752, 8947, 13010, 16949, 21012, 25207, 29270, 46570, 42443, 38312, 34185, 62830, 58703, 54572,
    50445, 13538, 9411, 5280, 1153, 29798, 25671, 21540, 17413, 42971, 47098, 34713, 38840, 59231,
    63358, 50973, 55100, 9939, 14066, 1681, 5808, 26199, 30326, 17941, 22068, 55628, 51565, 63758,
    59695, 39368, 35305, 47498, 43435, 22596, 18533, 30726, 26663, 6336, 2273, 14466, 10403, 52093,
    56156, 60223, 64286, 35833, 39896, 43963, 48026, 19061, 23124, 27191, 31254, 2801, 6864, 10931,
    14994, 64814, 60687, 56684, 52557, 48554, 44427, 40424, 36297, 31782, 27655, 23652, 19525, 15522,
    11395, 7392, 3265, 61215, 65342, 53085, 57212, 44955, 49082, 36825, 40952, 28183, 32310, 20053,
    24180, 11923, 16050, 3793, 7920
];


function cmd_crc(buf, len) {
    let CRC16_data = 0x0000;
    for (let i = 0; i != len; ++i) {
        let t = (CRC16_data >> 8) ^ (buf[i] & 0xFF);
        CRC16_data = (CRC16_data << 8) ^ crc16_table[t];
        CRC16_data = '0x' + CRC16_data.toString(16).substring(CRC16_data.toString(16).length - 4)
        Hex2Decimal(CRC16_data)
    }


    return CRC16_data;
};

export function cmd_build(payload) {
    let num = 0;
    let crc = 0;
    let buff = new Uint8Array(1029);
    buff[num++] = HEAD;			/*head*/

    if (pn > 255) {
        pn = 0
    }
    buff[num++] = Decimal2Hex(pn);	    /*pn*/
    buff[num++] = Decimal2Hex((~pn) >>> 0);    /*xpn*/
    // buff[num++] = 0x01	    /*pn*/
    // buff[num++] = 0xFE    /*xpn*/
    pn++



    if (payload != null && payload.byteLength > 0) {
        for (let i = 0; i < payload.byteLength; i++) {
            buff[num++] = payload[i]    /*data*/
        }
    } else {
        buff[num++] = 0x33;			    /* tmp data */
    }

    crc = cmd_crc(buff.slice(3, 3 + payload.length), payload.length);
    buff[num++] = (crc >> 8) & 0xff;
    buff[num++] = (crc >> 0) & 0xff;


    return buff;
};

export function cmd_build_EOT() {
    let num = 0;
    let buff = new Uint8Array(133);

    buff[num++] = 0x04
    buff[num++] = 0x00
    buff[num++] = 0xFF
    for (let i = 0; i < 128; i++) {
        buff[num++] = 0x00
    }
    buff[num++] = 0x00
    buff[num++] = 0x00

    return buff
}

export function cmd_build_SOH() {
    let num = 0;
    let buff = new Uint8Array(133);

    buff[num++] = 0x01
    buff[num++] = 0x00
    buff[num++] = 0xFF
    for (let i = 0; i < 128; i++) {
        buff[num++] = 0x00
    }
    buff[num++] = 0x00
    buff[num++] = 0x00

    return buff
}


export function bytes2Time(bytes) {
    let time = 0;
    for (let i = bytes.byteLength - 1; i >= 0; i--) {
        time += bytes[i] << (i * 8);
    }
    return time;
};


// Formats an 8-bit integer |value| in hexadecimal with leading zeros.
export function hex8(value) {
    return ('0x' + value.toString(16)).substring(-2).toUpperCase();
};

// Conversion from decimal to hexadecimal
function Decimal2Hex(value) {
    if (value.toString(16).length == 1) {
        return ('0x0' + value.toString(16))
    } else {
        return ('0x' + value.toString(16))
    }
}

// Conversion from hexadecimal to decimal
function Hex2Decimal(value) {
    return eval(value).toString(10)
}

// ASCII character to hexadecimal
function Asc2Hex(value) {
    return ('0x' + value.charCodeAt().toString(16));
}

export function bytes2String(buffer) {
    let bufferString = '';
    for (let byte of buffer)
        bufferString += ' ' + hex8(byte);
    return bufferString;
}
