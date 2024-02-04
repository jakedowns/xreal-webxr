
// air light 在 检查设备 => 连接设备 => 获取实例 => 判断设备类型 进行整合
// 不同类型升级提供俩个接口，通过判断设备类型分别调用不同的SDK包，再进行升级后续操作
let curGlasses = null;
const DEBUG = true;

import GlassesLight from './js_light/glasses.js';
import * as managerLight from './js_light/manager.js'
import GlassesAir from './js_air/glasses.js'
import * as managerAir from './js_air/manager.js'

// *******************

export function isNrealDevice(device) {
    // 涉及俩种设备的区分协议(符合 air 和 light 俩种Nreal设备)
    // console.log({
    //     pid_hex: device.productId.toString(16),
    //     pid_dec: device.productId
    // })
    return device.productId == 0x0423 
    || device.productId == 0x573C
    || device.productId == 0x0424;
}

export function addHidListener() {
    navigator.hid.onconnect = function (event) {
        let device = event.device;
        if (device.productId == 1059 || device.productId == 1060) {
            console.log('connected',{device});
            managerAir.canCommand(device).then(result => {
                if (result) {
                    curGlasses = new GlassesAir(device);
                }
            });
        }
        if (device.productId == 22332 || device.productId == 22336) {
            managerLight.canCommand(device).then(result => {
                if (result) {
                    curGlasses = new GlassesLight(device);
                }
            });
        }
    }

    navigator.hid.ondisconnect = function (event) {
        if (curGlasses && curGlasses.device == event.device) {
            curGlasses = null;
        }
    }

}

window.curGlassesArray = [];

export function checkConnection() {
    if (curGlasses) {
        return curGlasses;
    }

    return navigator.hid.getDevices().then(devices => {
        // console.warn('filtering', devices);
        // filters out devices that are nreal devices.
        return devices.filter(isNrealDevice);
    }).then(async devices => {
        console.log('filtered:', devices)

        for (let device of devices) {
            // if(curGlasses){
            //     console.warn('skipping',device)
            //     continue;
            // }
            if (device.productId == 1059 || device.productId == 1060) {
                console.log({air:device});
                if (await managerAir.canCommand(device)) {
                    curGlasses = new GlassesAir(device);
                    curGlassesArray.push(curGlasses);
                    return curGlasses;
                }
            }
            if (device.productId == 22332 || device.productId == 22336) {
                if (await managerLight.canCommand(device)) {
                    curGlasses = new GlassesLight(device);
                    return curGlasses;
                }
            }
        }
    });
}

export function requestDevice() {
    return navigator.hid.requestDevice({
        filters: [{
            vendorId: 0x0486, // ? ASUS Computers Inc. ?
        }, {
            vendorId: 0x0483, // STMicroelectronics ?
        }, {
            vendorId: 0x0482, // Kyocera Corporation ?
        }, {
            vendorId: 0x3318, // Gleaming Reality (Wuxi) Technology Co., LTD ?
        }]
    }).then(async devices => {
        for (let device of devices) {
            if (deviceIsAir(device)) {
                // can command checks isMcu
                // air shows up as 3 separate HID devices
                // but we only select 1 that can be commanded
                // this code was originally from their activation/update page
                // so, maybe devices OTHER than MCU can be communicated with via JS?
                // I'm not sure yet...
                if (await managerAir.canCommand(device)) {
                    curGlasses = new GlassesAir(device);
                    return curGlasses;
                }
            } else if (deviceIsLight(device)) {
                // NOTE i don't have a Light to test with,
                // so all my work is focusedd on the Air Protocol for now...
                if (await managerLight.canCommand(device)) {
                    curGlasses = new GlassesLight(device);
                    return curGlasses;
                }
            }
        }
    });
}

export async function connectDevice() {
    let glasses = await checkConnection();
    if (glasses) {
        return glasses;
    }
    return await requestDevice();
}

export async function disconnectDevice() {
    if(curGlasses){
        curGlasses._device.close()
        curGlasses = null;
    }
}

export function deviceIsAir(device){
    // 0x423 || 0x424
    return device.productId == 1059 || device.productId == 1060
}

export function deviceIsLight(device){
    // 0x573C || 0x5740
    return device.productId == 22332 || device.productId == 22336
}

// check glasses is air or light?
export function isAirOrLight() {
    if (!curGlasses) {
        return 'not found device';
    }
    if (deviceIsAir(curGlasses.device)) {
        return 1
    }
    if (deviceIsLight(curGlasses.device)) {
        return 2
    }
    return null
}

export function hexStream2int8Array(captureString){
    return new Uint8Array(captureString.match(/.{1,2}/g).map((b)=>{
        // console.log(b);
        return b //.parseInt(16)
    }))
}

export function parseHexString(captureString){
    return glasses.protocol.parse_rsp(hexStream2int8Array(captureString))
}

export {
    curGlasses
}
