
import Glasses from './glasses.js';
import * as Protocol from './protocol.js';
import * as common from './../common.js'


// let devices = [];
const DEBUG = true;
// progress bar
let current
let total
// DP progress
let dpCurrent
// DSP progress
let DspSecond
let DspThrid

/** check browser whether hid support */
// todo move to common
export function hidSupported() {
    return !(navigator.hid === undefined);
}


// check glasses is open?
// note we filter out things that arent the master control unit
export function canCommand(device) {
    if (device) {
        let glasses = new Glasses(device);
        return glasses.connect().then(() => {
            return glasses.isMcu();
        });
    }
    return false;
}

function getGlasses() {
    return common.curGlasses;
}


export async function hasActivated() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return false;
    }

    let activationReport = await glasses.sendReportTimeout(Protocol.MESSAGES.R_ACTIVATION_TIME);

    if (reportSuccess(activationReport) && activationReport.payload.length > 0) {
        let time = Protocol.bytes2Time(activationReport.payload);
        return time > 0;
    }
    return false;
}

// /** activate the glasses */
// export async function activate(timeStamp) {

//     let glasses = await common.connectDevice();
//     if (!glasses) {
//         return false;
//     }

//     // hardcode value = 300
//     // 3C 4B 46 52 54 41 01
//     const time = Protocol.time2Bytes(timeStamp);
//     return glasses.sendReportTimeout(Protocol.MESSAGES.W_ACTIVATION_TIME, time)
//         .then(report => {
//             return reportSuccess;
//         });
// }

// /** deactivate the glasses */
// export async function deactivate() {
//     let glasses = await common.connectDevice();
//     if (!glasses) {
//         return false;
//     }
//     return glasses.sendReportTimeout(Protocol.MESSAGES.W_CANCEL_ACTIVATION)
//         .then(report => {
//             return reportSuccess;
//         });
// }

// Conversion from decimal to hexadecimal
function Decimal2Hex(value) {
    if (value.toString(16).length == 1) {
        return ('0x0' + value.toString(16))
    } else {
        return ('0x' + value.toString(16))
    }
}

/** read firmware MCU version*/
export async function getFirmwareVersionInMcu() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_MCU_APP_FW_VERSION)
        .then(report => {
            if (reportSuccess(report)) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}

/** read firmware DP version*/
export async function getFirmwareVersionInDp() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_DP7911_FW_VERSION)
        .then(report => {
            if (reportSuccess(report)) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}

/** read firmware DSP version*/
export async function getFirmwareVersionInDsp() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_DSP_VERSION)
        .then(report => {
            if (reportSuccess(report)) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}

// Parameters required for the progress bar
// function progress(cur, all) {
//     current = cur
//     total = all
//     document.getElementById('progress').innerText = parseInt((current / total) * 100) + 1 + '%'
// }

// function progressInDp(cur) {
//     current = cur
//     document.getElementById('progressDp').innerText = current + '%'
// }

// export async function selectBinFile() {
//     const pickerOpts = {
//         types: [
//             {
//                 description: 'firmware image',
//                 accept: {
//                     'bin/*': ['.bin']
//                 }
//             },
//         ],
//         excludeAcceptAllOption: true,
//         multiple: false
//     };

//     let filePaths = await window.showOpenFilePicker(pickerOpts);
//     if (filePaths.length > 0) {
//         return filePaths[0].getFile();
//     }
//     return null;
// }


function isBootDevice(device) {
    return device.vendorId === Protocol.NREAL_VENDOR_ID
        && device.productId === Protocol.BOOT_PRODUCT_ID;
}

async function waitBootDevice() {
    let devices = await navigator.hid.getDevices().then(devices => {
        return devices.filter(isBootDevice);
    });

    if (devices.length > 0) {
        return devices[0];
    }
    // await requestDevice()

    await navigator.hid.requestDevice({
        filters: [{ vendorId: Protocol.NREAL_VENDOR_ID, productId: Protocol.NREAL_BOOT_PRODUCT_ID }]
    });
    const time = new Date().getTime();
    while ((new Date().getTime() - time) < 2000) {
        await new Promise(resolve => setTimeout(resolve, 20));
        devices = await navigator.hid.getDevices().then(devices => {
            return devices.filter(isBootDevice);
        });
        if (devices.length > 0) {
            return devices[0];
        }
    }
}


// export async function upgradeInMcu(data) {
//     let glasses = await common.connectDevice();
//     if (!glasses) {
//         return false;
//     }
//     return glasses.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_MCU_APP_FW_PREPARE)
//         .then(report => {
//             if (reportSuccess(report)) {
//                 return glasses.sendReportTimeout(Protocol.MESSAGES.W_MCU_APP_JUMP_TO_BOOT);
//             }
//         }).then(async (report) => {
//             if (reportSuccess(report)) {
//                 let device = await waitBootDevice();
//                 if (await canCommand(device)) {
//                     return sendFirmwareInMcu(new Glasses(device), data);
//                 }
//             }

//         });
// }

export function Asc2Hex(value) {
    return ('0x' + value.charCodeAt().toString(16));
}

/** need to upgrade firmware DSP version? */
// export async function isNeedUpgradeInDsp(version) {
//     let glasses = await common.connectDevice();
//     if (!glasses) {
//         return 'not found device';
//     }
//     let HexVersion = version.split('').map((item, index) => {
//         return Asc2Hex(item)
//     })
//     return glasses.sendReportTimeout(Protocol.MESSAGES.R_IS_NEED_UPGRADE_DSP_FW, HexVersion)
//         .then(report => {
//             if (reportSuccess(report)) {
//                 return report.payload[0]
//             }
//         });
// }

export async function upgradeInDsp(data) {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return false;
    }
    return sendFirmwareInDsp(glasses, data);
}

/** need to upgrade firmware DP version? */
export async function isNeedUpgradeInDp() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_DP7911_FW_IS_UPDATE)
        .then(report => {
            if (reportSuccess(report)) {
                return report.payload[0]
            }
        });
}

export async function upgradeInDp() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return false;
    }
    // 添加眼镜休眠时间
    const time = Protocol.time2Bytes('600');
    return glasses.sendReportTimeout(Protocol.MESSAGES.W_SLEEP_TIME, time)
        .then(report => {
            if (reportSuccess(report)) {
                return glasses.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_DP)
                    .then(async report => {
                        if (reportSuccess(report)) {
                            // wait for air dp upgrade completed
                            while(!glasses._reports.has(27661) && common.curGlasses){
                                await sleep(500)
                                dpCurrent = glasses._reports.get(27660) ? glasses._reports.get(27660).status : 0
                                progressInDp(dpCurrent)
                            }
            
                            return glasses._reports.get(27661) ? glasses._reports.get(27661).status == 0 : false
                        }
            
                        return false
                    });
            }
        });

}


async function sendFirmwareInMcu(bootDevice, data) {

    let ofs = 0;
    const firstPackLen = 24;
    const fwLen = data.byteLength;




    let report = await bootDevice.sendReportTimeout(
        Protocol.MESSAGES.W_UPDATE_MCU_APP_FW_START,
        data.slice(ofs, ofs + firstPackLen));
    if (!reportSuccess(report)) {
        console.error('send fw data failed');
        return false;
    }
    ofs += firstPackLen;

    while (ofs < fwLen) {
        progress(ofs, fwLen)
        if ((ofs + 42) > fwLen) {
            report = await bootDevice.sendReportTimeout(
                Protocol.MESSAGES.W_UPDATE_MCU_APP_FW_TRANSMIT,
                data.slice(ofs, fwLen));
            if (!reportSuccess(report)) {
                console.error('send fw data failed');
                return false;
            }
        }
        report = await bootDevice.sendReportTimeout(
            Protocol.MESSAGES.W_UPDATE_MCU_APP_FW_TRANSMIT,
            data.slice(ofs, ofs + 42));

        if (!reportSuccess(report)) {
            console.error('send fw data failed');
            return false;
        }
        ofs += 42;
    }

    /* send finish */
    report = await bootDevice.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_MCU_APP_FW_FINISH);
    // if (!reportSuccess(report)) {
    //     console.error('send fw data failed');
    //     return false;
    // }
    /* jump to app */
    report = await bootDevice.sendReportTimeout(Protocol.MESSAGES.W_BOOT_JUMP_TO_APP);
    // if (!reportSuccess(report)) {
    //     console.error('send fw data failed');
    //     return false;
    // }

    // Send the command to upgrade the DP
    // report = await bootDevice.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_DP);


    current = 0
    total = 0
    return true;


}


async function sendFirmwareInDsp(glasses, data) {

    let ofs = 0;
    let sendBufferLength = 0
    const firstPackLen = 24;
    const fwLen = data.byteLength;


    // prepare upgrade dsp
    await glasses.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_DSP_APP_FW_PREPARE);

    // wait for air dsp upgrade boot
    while (!glasses._reports.has(27663)) {
        await sleep(100)
    }

    // await sleep(30000)

    let report = await glasses.sendReportTimeout(
        Protocol.MESSAGES.W_UPDATE_DSP_APP_FW_START,
        data.slice(ofs, ofs + firstPackLen));
    if (!reportSuccess(report)) {
        console.error('send fw data failed');
        return false;
    }
    ofs += firstPackLen;

    while (ofs < fwLen) {
        if ((ofs + 42) <= fwLen) {
            progress(ofs, fwLen)
        }
        if ((ofs + 42) > fwLen) {
            report = await glasses.sendReportTimeout(
                Protocol.MESSAGES.W_UPDATE_DSP_APP_FW_TRANSMIT,
                data.slice(ofs, fwLen));
            if (!reportSuccess(report)) {
                console.error('send fw data failed');
                return false;
            }

            // 最后一包4K发送

            // air DSP one package write finish, wait a while
            // while(!glasses._reports.has(27662)){
            //     await sleep(100)
            // }
            // glasses._reports.delete(27662)
            await sleep(300)

            sendBufferLength = 0

            break
        }
        report = await glasses.sendReportTimeout(
            Protocol.MESSAGES.W_UPDATE_DSP_APP_FW_TRANSMIT,
            data.slice(ofs, ofs + 42));


        if (!reportSuccess(report)) {
            console.error('send fw data failed');
            return false;
        }
        ofs += 42;
        sendBufferLength += 42

        if (sendBufferLength >= 4096) {
            // 等待4K包传完回送消息

            // air DSP one package write finish, wait a while
            while (!(glasses._reports.has(27662) && (glasses._reports.get(27662).status == 0 || glasses._reports.get(27662).status == 1))) {
                // while(!glasses._reports.has(27662)){
                await sleep(100)
            }
            glasses._reports.delete(27662)

            // await sleep(300)


            sendBufferLength -= 4096
        }
    }

    /* send finish */
    report = await glasses.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_DSP_APP_FW_FINISH);
    // if (!reportSuccess(report)) {
    //     console.error('send fw data failed');
    //     return false;
    // }
    // dsp write bin ==> first 100%
    progress(ofs,fwLen)
    /* Check whether the upgrade is complete */
    // air DSP judge for flash&boot
    // 删除之前刷新boot的过程，dsp重新刷新
    glasses._reports.delete(27664)
    while(!(glasses._reports.has(27664) && (glasses._reports.get(27664).status == 100))){
        if(common.curGlasses){
            await sleep(100)
            DspSecond = glasses._reports.has(27664) ? glasses._reports.get(27664).status : 0
        }else{
            return false
        }
    }
    DspSecond = 100

    while(!(glasses._reports.has(27667) && (glasses._reports.get(27667).status == 100))){
        if(common.curGlasses){
            await sleep(100)
            DspThrid = glasses._reports.has(27667) ? glasses._reports.get(27667).status : 0
        }else{
            return false
        }
    }
    DspThrid = 100

    while (!(glasses._reports.has(27668) && (glasses._reports.get(27668).status == 0))) {
        await sleep(100)
    }

    // report = await glasses.sendReportTimeout(Protocol.MESSAGES.E_DSP_UPDATE_ENDING);

    current = 0
    total = 0
    DspSecond = 0
    DspThrid = 0
    return true;


}

// Delay synchronization program execution
function sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay))
}


/** read air glasses SN*/
export async function getSN() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_GLASSID)
        .then(report => {
            if (reportSuccess(report)) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}

/** read air glassess Brightness */
export async function getBrightness() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    // what's the chance the getBrightness is the same as setBrightness?
    return glasses.sendReportTimeout(Protocol.MESSAGES.W_BRIGHTNESS)
    .then(report => {
            if (reportSuccess(report)) {
                return report.payload;
                // return String.fromCharCode.apply(null, report.payload);
            }
        });
}

/** write air glassess Brightness */
export async function setBrightness(brightness_int) {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    const payload = Protocol.brightInt2Bytes(brightness_int-1);
    return glasses.sendReportTimeout(Protocol.MESSAGES.W_BRIGHTNESS, payload)
    .then(report => {
            if (reportSuccess(report)) {
                return report.payload;
            }
        });
}




// export async function isAirOrLight(){
//     let glasses = await common.connectDevice();
//     if (!glasses) {
//         return 'not found device';
//     }
//     if(glasses.device.productId == 1059 || glasses.device.productId == 1060){
//         return 1
//     }
//     if(glasses.device.productId == 22332 || glasses.device.productId == 22336){
//         return 2
//     }
// }


function reportSuccess(report) {
    return report && report.status === 0;
}

export {
    current,
    total,
    dpCurrent
}