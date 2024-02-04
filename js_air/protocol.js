
const HEAD = 0xfd;
const MSG_ID_OFS = 15;
const PAYLOAD_OFS = 22;
const LEN_OFS = 5;
const CRC_OFS = 1;
const TS_OFS = 7;
const RESERVED_OFS = 17;


export const NREAL_VENDOR_ID = 0x3318;
export const BOOT_PRODUCT_ID = 0x0423;


export const MESSAGES = {
    W_CANCEL_ACTIVATION: 0x19,
    R_MCU_APP_FW_VERSION: 0x26,//MCU APP FW version.
    R_GLASSID: 0x15,//MCU APP FW version.
    // R_DSP_APP_FW_VERSION: 0x21,//DSP APP FW version.
    R_DP7911_FW_VERSION: 0x16,//DP APP FW version.
    R_ACTIVATION_TIME: 0x29,//Read activation time
    W_ACTIVATION_TIME: 0x2A,//Write activation time
    W_SLEEP_TIME: 0x1E,//Write unsleep time

    // R_IS_NEED_UPGRADE_DSP_FW: 0x49,//Check whether the DSP needs to be upgraded.
    // W_FORCE_UPGRADE_DSP_FW: 0x69,//Force upgrade DSP.
    R_DSP_VERSION: 0x18,//DSP APP FW version.
    W_UPDATE_DSP_APP_FW_PREPARE: 0x45,	//(Implemented in APP)
    W_UPDATE_DSP_APP_FW_START: 0x46,	//(Implemented in APP)
    W_UPDATE_DSP_APP_FW_TRANSMIT: 0x47,	//(Implemented in APP)
    E_DSP_ONE_PACKGE_WRITE_FINISH: 0x6C0E,	//(check 4K as one package send)
    W_UPDATE_DSP_APP_FW_FINISH: 0x48,	//(Implemented in APP)
    E_DSP_UPDATE_ENDING: 0x6C11, //whether the upgrade is complete.
    E_DSP_UPDATE_PROGRES: 0x6C10, //before upgrade dsp, air for update dsp boot

    W_UPDATE_MCU_APP_FW_PREPARE: 0x3E,//Preparations for mcu app fw upgrade
    W_UPDATE_MCU_APP_FW_START: 0x3F,	//(Implemented in Boot)
    W_UPDATE_MCU_APP_FW_TRANSMIT: 0x40,	//(Implemented in Boot)
    W_UPDATE_MCU_APP_FW_FINISH: 0x41,	//(Implemented in Boot)
    W_BOOT_JUMP_TO_APP: 0x42,	//(Implemented in Boot)
    W_MCU_APP_JUMP_TO_BOOT: 0x44,
    R_DP7911_FW_IS_UPDATE:0x3C,
    W_UPDATE_DP: 0x3D,


    W_BOOT_UPDATE_MODE: 0x1100,
    W_BOOT_UPDATE_CONFIRM: 0x1101,
    W_BOOT_UPDATE_PREPARE: 0x1102,

    W_BOOT_UPDATE_START: 0x1103,
    W_BOOT_UPDATE_TRANSMIT: 0x1104,
    W_BOOT_UPDATE_FINISH: 0x1105,

    // P_ = pushed from device

    // 11-bit payload
    P_BUTTON_PRESSED: 0x6C05,

    // appear to fire every 5 seconds with payload = 0
    P_UKNOWN_HEARTBEAT: 0x6c02,
    P_UKNOWN_HEARTBEAT_2: 0x6c12
};

export function keyForHex(hex){
    for (let key in MESSAGES) {
        if (MESSAGES[key] == hex) {
            return key;
        }
    }
    return null;
}


export function listKnownCommands(){
    let data = [];
    Object.keys(MESSAGES).map((key)=>{
        

        data.push({
            key,
            hex:'0x'+MESSAGES[key].toString(16),
            dec:MESSAGES[key]
        })
    })

    console.log('air commands:');
    console.table(data);
}


const crc32_table = [
    0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
    0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
    0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
    0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
    0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE,
    0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
    0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC,
    0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
    0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
    0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
    0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940,
    0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
    0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116,
    0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
    0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
    0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
    0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A,
    0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
    0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818,
    0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
    0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
    0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
    0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C,
    0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
    0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2,
    0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
    0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
    0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
    0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086,
    0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
    0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4,
    0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
    0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
    0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
    0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8,
    0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
    0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE,
    0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
    0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
    0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
    0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252,
    0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
    0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60,
    0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
    0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
    0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
    0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04,
    0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
    0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A,
    0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
    0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
    0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
    0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E,
    0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
    0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C,
    0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
    0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
    0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
    0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0,
    0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
    0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6,
    0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
    0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
    0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D
];


function cmd_crc(buf, len) {
    let CRC32_data = 0xFFFFFFFF;
    for (let i = 0; i != len; ++i) {
        let t = (CRC32_data ^ buf[i]) & 0xFF;
        CRC32_data = ((CRC32_data >> 8) & 0xFFFFFF) ^ crc32_table[t];
    }

    return ~CRC32_data;
};

export function cmd_build(msgId, payload) {
    let crc = 0;
    let buff = new Uint8Array(64);
    buff[0] = HEAD;

    // memset(buff + TS_OFS, 0, 8);
    // memset(buff + RESERVED_OFS, 0, 5);

    buff[MSG_ID_OFS] = (msgId >> 0) & 0xff;
    buff[MSG_ID_OFS + 1] = (msgId >> 8) & 0xff;

    let len = /*LEN*/2 + /*TS*/8 + /*MSG_ID*/2 + /*RESERVED*/5;

    if (payload != null && payload.length > 0) {
        buff.set(payload, PAYLOAD_OFS);
        len += payload.length;
    }
    buff[LEN_OFS] = (len) & 0xff;
    buff[LEN_OFS + 1] = (len >> 8) & 0xff;

    crc = cmd_crc(buff.slice(LEN_OFS), len);
    buff[CRC_OFS] = (crc >> 0) & 0xff;
    buff[CRC_OFS + 1] = (crc >> 8) & 0xff;
    buff[CRC_OFS + 2] = (crc >> 16) & 0xff;
    buff[CRC_OFS + 3] = (crc >> 24) & 0xff;
    return buff;
};

function get_msgId(response) {
    let msgId = (response[15]) | (response[16] << 8);
    return msgId;
};

function get_status_byte(response) {
    return response[22];
};

window.unparsed = [];

// 4-bytes to 32-bit float
function four_bytes_to_float(byte_array){
    var data = byte_array; // [64, 226, 157, 10];

    // Create a buffer
    var buf = new ArrayBuffer(4);
    // Create a data view of it
    var view = new DataView(buf);

    // set bytes
    data.forEach(function (b, i) {
        view.setUint8(i, b);
    });

    // Read the bits as a float; note that by doing this, we're implicitly
    // converting it from a 32-bit float into JavaScript's native 64-bit double
    var num = view.getFloat32(0);

    return num;
}


export function parse_rsp(rsp) {
    let result = {
        msgId: -1,
        status: 0,
        payload: new Uint8Array()
    };

    if(rsp[0] !== HEAD){
        // console.warn('HEAD mismatch', rsp[0]);
        // console.warn([...rsp].map(x => x.toString(16).padStart(2,'0')).join(' '));
        if(window.unparsed.length<1000){
            window.unparsed.push([...rsp].map(x => x.toString(16).padStart(2,'0')).join(','))

            // extract 16 32-bit,4-byte floats from 64 bytes
            // NOPE
            // window.unparsed.push([
            //     [
            //         four_bytes_to_float(rsp.slice(0,4)),
            //         four_bytes_to_float(rsp.slice(4,8)),
            //         four_bytes_to_float(rsp.slice(8,12)),
            //         four_bytes_to_float(rsp.slice(12,16)),
            //     ],
            //     [
            //         four_bytes_to_float(rsp.slice(16,20)),
            //         four_bytes_to_float(rsp.slice(20,24)),
            //         four_bytes_to_float(rsp.slice(24,28)),
            //         four_bytes_to_float(rsp.slice(28,32)),
            //     ],
            //     [
            //         four_bytes_to_float(rsp.slice(32,36)),
            //         four_bytes_to_float(rsp.slice(36,40)),
            //         four_bytes_to_float(rsp.slice(40,44)),
            //         four_bytes_to_float(rsp.slice(44,48)),
            //     ],
            //     [
            //         four_bytes_to_float(rsp.slice(48,52)),
            //         four_bytes_to_float(rsp.slice(52,56)),
            //         four_bytes_to_float(rsp.slice(56,60)),
            //         four_bytes_to_float(rsp.slice(60,64)),
            //     ]
            // ])
        }

        /*
            tried assuming the entire payload was 4x4 32-bit numbers,
            but some of these values are way out there, so it's not
            close but not quite

            [2.3931767537309237e-38, 262153.6875, 1.7935222607106134e-33, -1.2112571145736495e-19]
            [1.6100218705859986e-40, -1.0015453862283195e+36, 7.89323398984883e-39, 0]
            [7.068319291428253e-38, -2.0569895575965996e-38, 4.316160146187087e+34, 3.6734198463196485e-40]
            [4164320, 8.664825968624503e-22, -3.881952544155522e-34, 0]
        */

        return;
        // debugger 
    }

    if (rsp == null || rsp.length < 1) {
        return result;
    }

    result.msgId = get_msgId(rsp);
    result.status = get_status_byte(rsp);


    let packet_len = (rsp[5]) | (rsp[6] << 8);
    if (packet_len < 18) {
        return result;
    }
    packet_len = packet_len - 17 - 1;/* len, ts, msgid, reserve, status*/
    result.payload = rsp.slice(PAYLOAD_OFS + 1, PAYLOAD_OFS + 1 + packet_len);
    return result;
};

// todo: learn bitshifts/bitmasks and stuff instead of writing it out
// export const brightness_map = [
//     //     3: 6 = increase (3= button id)
//     //        7 = decrease
//     //     7: intensity 0-7
//     // 0 0 0 4 - 0 0 0 8 - 0 0 0
//     "0 0 0 6 0 0 0 0 0 0 0", // dimmest
//     "0 0 0 6 0 0 0 1 0 0 0",
//     "0 0 0 6 0 0 0 2 0 0 0",
//     "0 0 0 6 0 0 0 3 0 0 0",
//     "0 0 0 6 0 0 0 4 0 0 0",
//     "0 0 0 6 0 0 0 5 0 0 0",
//     "0 0 0 6 0 0 0 6 0 0 0",
//     "0 0 0 6 0 0 0 7 0 0 0", // brightest
// ]

// arg brightness_int 1-8, 8 being the brightest
export function brightInt2Bytes(brightness_int) {
    // const req_bright = brightness_map[parseInt(brightness_int)-1];
    // const byte_arr = new Uint8Array(req_bright.split(' ').map(x => parseInt(x)));
    // return byte_arr
    return new Uint8Array(['0' + brightness_int]);
}

// arg Uint8Array, returns string
export function brightBytes2Int(bright_byte_arr) {
    return bright_byte_arr[7] + 1;
    //return brightness_map.indexOf(bright_byte_arr.join(' ')) + 1;
}


export function bytes2Time(bytes) {
    let time = '';
    for (let i = bytes.byteLength - 1; i >= 0; i--) {
        if(i > 3){
            time += bytes[i].toString(2)
        }else{
            time += bytes[i].toString(2)
            // time += bytes[i] << (i * 8);
        }
    }
    return time;
};

export function hex2Decimal(byte){
    return parseInt(byte, 16);
}

export function time2Bytes(timeStamp){
    let arr = new Uint8Array(8)
    let len = Math.floor((Number(timeStamp).toString(2).length) / 8)
    let longN = parseInt(Number(timeStamp).toString(2).substring(0,Number(timeStamp).toString(2).length - 32), 2)
    for (let i = len; i >= 0; i--) {
        if(i > 3){
            arr[i] = ((longN >>> ((i - 4) * 8)) & 0xFF);
        }else{
            arr[i] = ((timeStamp >>> (i * 8)) & 0xFF);
        }
    }
    return arr;
}


// Formats an 8-bit integer |value| in hexadecimal with leading zeros.
export function hex8(value) {
    return ('0x' + value.toString(16)).substring(-2).toUpperCase();
};
export function bytes2String(buffer) {
    let bufferString = '';
    for (let byte of buffer)
        bufferString += ' ' + hex8(byte);
    return bufferString;
}
