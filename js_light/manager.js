
import Glasses from './glasses.js';
import * as Protocol from './protocol.js';
import * as ProtocolYmodem from './protocolYmodem.js';
import * as common from './../common.js'

// let devices = [];
const DEBUG = true;
// progress bar
let current
let total

/** check browser whether hid support */
// todo move to common
export function hidSupported() {
    return !(navigator.hid === undefined);
}

/** check browser whether serial support */
// export function serialSupported() {
//     return !(navigator.serial === undefined);
// }


// check glasses is open?
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


export async function hasActivated(glasses) {
    let activationReport = await glasses.sendReportTimeout(Protocol.MESSAGES.R_ACTIVATION_TIME);

    if (!reportSuccess(activationReport) && activationReport.payload.length > 0) {
        let time = Protocol.bytes2Time(activationReport.payload);
        return time > 0;
    }
    return false;
}

/** activate the glasses */
export async function activate(timeStamp, flag) {

    let glasses = await common.connectDevice();
    if (!glasses) {
        return false;
    }
    // if (await hasActivated(glasses)) {
    //     return true;
    // }

    // hardcode value = 300
    // const time = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x01]);
    let time
    if (flag == 1) {
        time = new Uint8Array([0xff, 0xff]);
    } else {
        let timeHex = Number(timeStamp).toString(16)
        time = new Uint8Array(timeHex.toString().length);
        for (let i = 0; i < timeHex.toString().length; i++) {
            time[i] = Asc2Hex(timeHex.toString().slice(i, i + 1))
        }
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.W_ACTIVATION_TIME, time, 1)
        .then(report => {
            return reportSuccess;
        });
}

/** deactivate the glasses */
export async function deactivate() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return false;
    }

    // 时间清除
    activate('ff', 1)

    const deactiveMessage = new Uint8Array([0x31]);
    return glasses.sendReportTimeout(Protocol.MESSAGES.W_CANCEL_ACTIVATION, deactiveMessage, 1)
        .then(report => {
            return reportSuccess(report);
        });
}

// Conversion from decimal to hexadecimal
function Asc2Hex(value) {
    return ('0x' + value.charCodeAt().toString(16));
}

/** read firmware version MCU*/
export async function getFirmwareVersionInMcu() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_MCU_APP_FW_VERSION)
        .then(report => {
            if (reportSuccess) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}

/** read firmware version AUDIO*/
export async function getFirmwareVersionInAudio() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_AUDIO_APP_FW_VERSION)
        .then(report => {
            if (reportSuccess) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}

/** read firmware version OV580*/
export async function getFirmwareVersionInOv580() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_OV580_APP_FW_VERSION)
        .then(report => {
            if (reportSuccess) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}



export async function selectBinFile() {
    const pickerOpts = {
        types: [
            {
                description: 'firmware image',
                accept: {
                    'bin/*': ['.bin']
                }
            },
        ],
        excludeAcceptAllOption: true,
        multiple: false
    };

    let filePaths = await window.showOpenFilePicker(pickerOpts);
    if (filePaths.length > 0) {
        return filePaths[0].getFile();
    }
    return null;
}


// function isBootDevice(device) {
//     return device.vendorId === ProtocolYmodem.NREAL_VENDOR_ID
//         && device.productId === ProtocolYmodem.BOOT_PRODUCT_ID;
// }

// 通过hid识别设备
// async function waitBootDevice() {
//     let devices = await navigator.hid.getDevices().then(devices => {
//         return devices.filter(isBootDevice);
//     });

//     if (devices.length > 0) {
//         return devices[0];
//     }
//     navigator.hid.requestDevice({
//         filters: [{ vendorId: Protocol.NREAL_VENDOR_ID, productId: Protocol.BOOT_PRODUCT_ID }]
//     });
//     const time = new Date().getTime();
//     while ((new Date().getTime() - time) < 2000) {
//         await new Promise(resolve => setTimeout(resolve, 20));
//         devices = await navigator.hid.getDevices().then(devices => {
//             return devices.filter(isBootDevice);
//         });
//         if (devices.length > 0) {
//             return devices[0];
//         }
//     }
// }

export async function getSerialPort() {
    if ('serial' in navigator) {
        console.log('当前浏览器支持serial')
    }
    return navigator.serial.requestPort({
        filters: [{ usbVendorId: ProtocolYmodem.NREAL_VENDOR_ID, usbProductId: ProtocolYmodem.BOOT_PRODUCT_ID }]
    });
}

// NREAL GLASSES
// function isBootport(port){
//     return port.serialNumber === "00000000001A"
// }

// 通过USB虚拟串口识别
async function waitSerialPort() {
    let port = await navigator.serial.getPorts().then(port => {
        return port;
    });

    if (port.length > 0) {
        return port[0];
    }
    // MCU + AUDIO + 580

    // Prompt user to select any serial port.
    port = await getSerialPort()

    return port
}


export async function upgradeInMcuForSerial(data){
    let port = await waitSerialPort();
    // let device = await waitBootDevice();
    if (port) {
        // open serial port
        await port.open({ baudRate: 115200 });  //串口波特率
        return sendFirmwareInMcu(port, data);
    }
}


export async function upgradeInMcu(data) {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return false;
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.W_MCU_SUPER_B_JUMP_TO_A)
        // .then(report => {
        //     if (reportSuccess) {
        //         return glasses.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_MCU_SUPER_A_FW_START);
        //     }
        // })
        .then(async (report) => {
            if (reportSuccess) {
                let port = await waitSerialPort();
                // let device = await waitBootDevice();
                if (port) {
                    // open serial port
                    await port.open({ baudRate: 115200 });  //串口波特率
                    return sendFirmwareInMcu(port, data);
                }
            }

        });
}

// Delay synchronization program execution
function sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay))
}

export async function upgradeInDp() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return false;
    }

    // upgrade DP
    if (DEBUG) console.log("send fw to upgrade the DP");
    return glasses.sendReportTimeout(Protocol.MESSAGES.W_UPDATE_DP, [], 1)
        .then(async report => {
            if (!reportSuccess(report)) {
                if (glasses._reports.has(68)) {
                    glasses._reports.delete(68)
                }
                // wait for light dp upgrade completed
                while (!glasses._reports.has(68)) {
                    await sleep(500)
                }


                return glasses._reports.get(68).payload[0] == 49
            }

            return false
        });
}

// check glasses is air or light?
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

// Listening for serial port response
async function listenSerial(reader, port) {
    while (port.readable) {
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (value) {
                    return value
                }
            }
        } catch (error) {
            // TODO: Handle non-fatal read error.
            //   console.log(error)
        }
    }

}

// Parameters required for the progress bar
function progress(cur, all) {
    current = cur
    total = all
}


async function sendFirmwareInMcu(port, data) {

    data = new Uint8Array(data)
    let ofs = 0;
    const firstPackLen = 1024;
    const fwLen = data.byteLength;


    const writer = port.writable.getWriter();
    const reader = port.readable.getReader();


    // Write upgrade command
    await writer.write(Protocol.cmd_build(Protocol.MESSAGES.W_UPDATE_MCU_SUPER_A_FW_START))
    console.log(await listenSerial(reader, port))

    // Transmission over serial port
    // Ymodem

    while (ofs < fwLen) {
        progress(ofs, fwLen)
        if ((ofs + 1024) > fwLen) {
            let DATNB = ProtocolYmodem.cmd_build(data.slice(ofs, fwLen))
            await writer.write(DATNB)
            // console.log(await listenSerial(reader, port))
            break;
        }

        let DATNB = ProtocolYmodem.cmd_build(data.slice(ofs, ofs + firstPackLen))
        await writer.write(DATNB)
        // console.log(await listenSerial(reader, port))
        // .then(async (report)=>{
        //     while (port.readable) {
        //         const reader = port.readable.getReader();

        //         try {
        //           while (true) {
        //             const { value, done } = await reader.read();
        //             if (done) {
        //               // Allow the serial port to be closed later.
        //               reader.releaseLock();
        //               break;
        //             }
        //             if (value) {
        //               console.log(value);
        //             }
        //           }
        //         } catch (error) {
        //           // TODO: Handle non-fatal read error.
        //         }
        //       }
        // })


        ofs += 1024;

    }

    /* send finish */


    // if (!reportSuccess(report)) {
    //     console.error('send fw data failed');
    //     return false;
    // }

    let EOT_FIRST = ProtocolYmodem.cmd_build_EOT()
    await writer.write(EOT_FIRST)
    // console.log(await listenSerial(reader, port))

    let EOT_SECOND = ProtocolYmodem.cmd_build_EOT()
    await writer.write(EOT_SECOND)
    // console.log(await listenSerial(reader, port))

    // let SOH = ProtocolYmodem.cmd_build_SOH()
    // await writer.write(SOH)
    // console.log(await listenSerial(reader, port))


    /* jump to B */
    await writer.write(Protocol.cmd_build(Protocol.MESSAGES.W_MCU_SUPER_A_JUMP_TO_B))


    // Send the command to upgrade the DP
    // await writer.write(Protocol.cmd_build(Protocol.MESSAGES.W_UPDATE_DP, [], 1))


    // report = await bootDevice.sendReportTimeout(Protocol.MESSAGES.W_MCU_SUPER_A_JUMP_TO_B);
    // if (!reportSuccess(report)) {
    //     console.error('send fw data failed');
    //     return false;
    // }

    // close serial port
    // reader.releaseLock();
    // await port.close();

    return true;


}


/** read Glasses SN*/
export async function getSN() {
    let glasses = await common.connectDevice();
    if (!glasses) {
        return 'not found device';
    }
    return glasses.sendReportTimeout(Protocol.MESSAGES.R_GLASSID)
        .then(report => {
            if (reportSuccess) {
                return String.fromCharCode.apply(null, report.payload);
            }
        });
}


function reportSuccess(report) {
    return (report && report.payload.length === 0);
}

export {
    current,
    total,
}