import * as Protocol from './protocol.js';

import sparkline from '../tools/sparkline.js'

/* captures */
// TODO: move this to another folder
// import {captures} from './captures.js';
// window.captures = captures

// let values = '';

// let fourBytesToFloat = (data) => {
//     // Create a buffer
//     var buf = new ArrayBuffer(4);
//     // Create a data view of it
//     var view = new DataView(buf);

//     // set bytes
//     data.forEach(function (b, i) {
//         view.setUint8(i, b);
//     });

//     // Read the bits as a float; note that by doing this, we're implicitly
//     // converting it from a 32-bit float into JavaScript's native 64-bit double
//     var num = view.getFloat32(0);
//     // Done
//     // console.log(num);

//     return num;
// }

// captures.forEach((capture,i)=>{
//     if(i<100){
//         if(capture.msgId === "0 0x0" && capture.payload.split(' ').length === 41){
//             // hex2dec
//             // console.log(capture.payload.split(' ').map(x=>parseInt(x).toString().padStart(2,'0')))
//             // const hex2dec = capture.payload.split(' ').map((x,k)=>{
//             //     // return x.padStart(2,'0')
//             //     let i = parseInt(x,16)
//             //     return i ? i.toString().padStart(3, '0') : '   '
//             // }).join(' ');
//             // values+=hex2dec+'\n';
//             // console.log(hex2dec)

//             // ok i think it's transmitted as a 4x4f matrix, based on 
//             // \NRSDK\Scripts\Utility\ConversionUtility.cs

//             // convert string representation of 41 bytes to Uint8Array
//             // hrm... 41 bytes is too small a payload for 16 floats would need at least 48 bytes
            
//             let _payload = new Uint8Array(capture.payload.split(' ').map(x=>parseInt(x,16)));

//             // let f0 = fourBytesToFloat(_payload.slice(0,4));

//             // extract 4x4 matrix of floats from byte-string
//             let _f = [];
//             for(let i=0;i<4;i++){

//                 // push 3 4-byte floats to _f
//                 for(let j=0;j<3;j++){
//                     let bytes = _payload.slice((i*4)+j,(i*4)+j+4)
//                     _f.push(fourBytesToFloat(bytes))
//                 }

//             }
//             // print 4x4 visual diagram to console

//             console.log(_f.map((x)=>{
//                 return x; //.toFixed(2)
//             }).join(', \n'))

//             console.log('-------')

//         }
//     }
// });

// console.log(values)
/* End captures */

window.sparkline_values = [];
let stop_at = Infinity;//1000;
let current = 0;

//reduce update rate
let render_every = 2;
let imu_report_current = 0;
window.max_history = 1000;


// 41-byte packets
window.fo_packets = [];
window.fo_status_min = Infinity;
window.fo_status_max = -Infinity;
window.fo_status_distribution = {};

window.i8_two_samples = [];

// non-41 byte packets
window.packets_len_distribution = {};
window.packets_status_distribution = {};

window.render_sparklines = true;

window.bar_heights = [];
let bars = [];

window.samples_for_csv = [];
window.stats_by_packet_length = {};

// set to false to disable printing output when
// mysterious msgId 0x0 is being received
window.imu_output = true; 

window.logPackets = () => {
    console.log('packets:',{
        packets_len_distribution,
        packets_status_distribution
    })
}

// window.logFOPackets = () => {
//     console.table([
//     {
//         // 0 - 255
//         min: window.fo_status_min,
//         max: window.fo_status_max,
//     }
//     ])
//     console.log(window.fo_status_distribution)
// }

export default class Glasses extends EventTarget {
    constructor(device) {
        console.log('constructing');
        super();
        this._device = device;
        this._interestMsg = [];
        this._reports = new Map();
        this._captures = [];
        // set input listener
        device.oninputreport = this._handleInputReport.bind(this);

        window.glasses = this;
        window.glasses.protocol = Protocol;

        this.setBrightness = window.Manager.setBrightness;

        for(let i = 0; i<41; i++){
            bars.push(document.querySelector('#imu-bars .bar:nth-child('+(i+1)+')'))
        }

        // this.renderSparklines();
    }

    renderSparklines(){
        if(!window.imu_output){
            return;
        }

        window.bar_heights.map((v,k)=>{
            if(bars[k]){
                bars[k].style.height = v+'px';
            }
        })

        // console.log('renderSparklines');
        if(window.render_sparklines){
            for(const [v,k] of window.sparkline_values){
                if(window.sparkline_elements[k]){
                    requestAnimationFrame(()=>{
                        sparkline(window.sparkline_elements[k],window.sparkline_values[k],{
                            spotRadius: 0
                        }) 
                    })
                }
            }    
        }
        

        // if(fo_packets.length){
            requestAnimationFrame(this.renderSparklines.bind(this))
        // }
    }

    dumpCaptures(){
        console.log(JSON.stringify(window.captures));
    }

    get device() { return this._device; }


    connect() {
        if (!this._device.opened) {
            return this._device.open();
        }
        return Promise.resolve();
    }
    _handleInputReport({ device, reportId, data }) {
        const reportData = new Uint8Array(data.buffer);
        let report = Protocol.parse_rsp(reportData);
        if(!report){
            return;
        }
        // console.log('input',{
        //     reportId, 
        //     data, 
        //     reportData, 
        //     report
        // });
        // if(device !== glasses._device){
        //     debugger;
        // }
        const packet = {
            dir: 'IN',
            reportId: reportId,
            plen: report.payload.length,
            status: report.status,
            msgId: [report.msgId, '0x'+(report.msgId.toString(16))].join(' '),
            key: Protocol.keyForHex(report.msgId),
            payload: report.payload.map(b => b.toString(16).padStart(2, "0")).join(' '),
            dec: report.payload.map(Protocol.hex2Decimal).join(' '),
            string: String.fromCharCode.apply(null, report.payload),
            // ascii: new TextDecoder().decode(
            //     new Uint8Array(
            //         report.payload
            //     )
            // ).split('\x00').join(' ')
        }

        if(report.msgId === 0){
            // console.log(report.payload.length, report.status)
            imu_report_current++;

            
            if(imu_report_current < 1000){
                // // update stats by packet length
                // if(!window.stats_by_packet_length[report.payload.length]){
                //     window.stats_by_packet_length[report.payload.length] = {
                //         count: 0,
                //         status: {
                //             distribution: {}
                //         },
                //         // byte_stats[pos] = {distribution: {}}
                //         byte_stats: {}
                //     }
                // } 
                // window.stats_by_packet_length[report.payload.length].count++;

                // if(!window.stats_by_packet_length[report.payload.length].status.distribution[report.status]){
                //     window.stats_by_packet_length[report.payload.length].status.distribution[report.status] = 0;
                // }
                // window.stats_by_packet_length[report.payload.length].status.distribution[report.status]++;

                // // update stats by byte position
                // for(let i = 0; i<report.payload.length; i++){
                //     if(!window.stats_by_packet_length[report.payload.length].byte_stats[i]){
                //         window.stats_by_packet_length[report.payload.length].byte_stats[i] = {
                //             distribution: {}
                //         }
                //     }
                //     if(!window.stats_by_packet_length[report.payload.length].byte_stats[i].distribution[report.payload[i]]){
                //         window.stats_by_packet_length[report.payload.length].byte_stats[i].distribution[report.payload[i]] = 0;
                //     }
                //     window.stats_by_packet_length[report.payload.length].byte_stats[i].distribution[report.payload[i]]++;
                // }
            }


            // status len data
            // samples_for_csv.push([report.status, report.payload.length, ...report.payload].join(','))
            // if(samples_for_csv.length > 1000){
            //     samples_for_csv.shift();
            // }


            if(imu_report_current === render_every && window.imu_output){
                imu_report_current = 0;
                
                // update text/bar graphs

                // console.log('got report',report);
                const stringified = [...report.payload].map((x,k)=>{
                    // return x.padStart(2,'0')
                    let i = x//parseInt(x)
                    let padded = (i).toString().padStart(3, '0');
                    let out = '' + (i ? padded : '___')
                    if((k+1)%4 === 0){
                        out+='&nbsp;&nbsp;|&nbsp;';
                    }
                    
                    //console.table([packet]);
                    // window.packets_len_distribution[report.payload.length] 
                    //     = (window.packets_len_distribution[report.payload.length] || 0) + 1;

                    // window.packets_status_distribution[report.status]
                    //     = (window.packets_status_distribution[report.status] || 0) + 1;

                    // update sparkline
                    if(current<stop_at && report.payload.length === 41){
                        i8_two_samples.push(report.payload[2]);
                        if(i8_two_samples.length > 50){
                            i8_two_samples.shift();
                        }
                        // fo_packets.push(report);
                        // if(fo_packets.length > window.max_history){
                        //     fo_packets.shift();
                        // }

                        // if(report.status < window.fo_status_min){
                        //     window.fo_status_min = report.status;
                        // }
                        // if(report.status > window.fo_status_max){
                        //     window.fo_status_max = report.status;
                        // }
                        // if(!window.fo_status_distribution[report.status]){
                        //     window.fo_status_distribution[report.status] = 0;
                        // }
                        // window.fo_status_distribution[report.status]++;

                        window.bar_heights[k] = i;

                        if(!window.sparkline_values[k]){
                            window.sparkline_values[k] = [];
                        }
                        if(window.sparkline_values[k].length > window.max_history){
                            window.sparkline_values[k].shift();
                        }

                        // debugger;
                        window.sparkline_values[k].push(i);
                    }
                    return out
                }).join(' ');

                document.getElementById('imu').innerHTML = stringified
                
                // debugger;
                if(current < stop_at){
                    current++;    
                }
                
                // if(current>=stop_at){
                //     console.warn('no longer updating sparklines');
                // }
                // console.log('IN',report.msgId);    
            }
        }else{
            console.table([packet])    
        }
        
        // console.log('IN',report.msgId);

        // window.captures.push(packet)

        if(report.msgId === Protocol.MESSAGES.P_BUTTON_PRESSED){
            
            // button press payloads are 11-bits

            //  ┌- first 4 bytes appear to be which button is pressed
            //  |     ┌- second 4 bytes are a associated payload
            //  |     |   ┌- haven't seen last 3 bits used yet
            // 0000 0000 000

            // Button IDs
            // 0001 = power button
            //      payloads
            //      0000 - turned off
            //      0001 - turned on
            // 0006 = brightness increase
            // 0007 = brightness decrease
            //      payloads
            //      0000 - 0007 = 8 brightness levels, 0007 being brightest


            const button = report.payload[3];
            const int = Protocol.brightBytes2Int(report.payload);


            // if report.payload[3] === 
            console.log('button pressed',
                {
                    button,
                    brightness_int: int
                });
            window.onBrightnessChanged(int);
        }

        this._reports.set(report.msgId, report);
    }

    sendReport(msgId, payload) {
        const data = new Uint8Array(payload);
        const cmd = Protocol.cmd_build(msgId, data);
        // console.log({
        //     msgId,
        //     payload,
        //     data,
        //     cmd
        // })

        console.table([{
            dir: 'OUT',
            msgId: [msgId, '0x'+(msgId.toString(16))].join(' '),
            key: Protocol.keyForHex(msgId),
            payload: data.join(' '),
            cmd: cmd.map(b => b.toString(16).padStart(2, "0")).join(' ')
        }])
        this._device.sendReport(0x00, cmd);
    }

    async sendReportTimeout(msgId, payload = [], timeout = 1000) {
        this.sendReport(msgId, payload);
        const time = new Date().getTime();
        while ((new Date().getTime() - time) < timeout) {
            if (this._reports.has(msgId)) {
                let report = this._reports.get(msgId);
                this._reports.delete(msgId);
                return report;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return null;
    }

    async isMcu() {
        const report = await this.sendReportTimeout(Protocol.MESSAGES.R_ACTIVATION_TIME);
        return report != null;
    }


    toString() {
        return `<Glasses deviceName=${this._device.productName} vid=${this._device.vendorId} pid=${this._device.vendorId}>`;
    }
}