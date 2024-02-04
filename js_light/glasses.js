import * as Protocol from './protocol.js';
import * as ProtocolYmodem from './protocolYmodem.js';


export default class Glasses extends EventTarget {
    constructor(device) {
        super();
        this._device = device;
        this._interestMsg = [];
        this._reports = new Map();
        // set input listener
        device.oninputreport = this._handleInputReport.bind(this);
    }

    get device() { return this._device; }


    connect() {
        if (!this._device.opened) {
            return this._device.open();
        }
        return Promise.resolve();
    }

    // Information parsing to distinguish between connect and upgrade
    _handleInputReport({ device, reportId, data }) {
        const reportData = new Uint8Array(data.buffer);
        // Different parsing modes by protocol
        let report = Protocol.parse_rsp(reportData);
        this._reports.set(report.msgId, report);
    }

    // light connect
    sendReport(msgId, payload, option) {
        const data = new Uint8Array(payload);
        const cmd = Protocol.cmd_build(msgId, data, option);
        this._device.sendReport(0x00, cmd);
    }

    async sendReportTimeout(msgId, payload = [], option, timeout = 3000) {
        this.sendReport(msgId, payload, option);
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



    // light upgrade
    //#region 
    // sendReportUpgrade(msgId, payload) {
    //     const data = new Uint8Array(payload);
    //     const cmd = Protocol.cmd_build(msgId, data);
    //     this._device.controlTransferOut(0x00, cmd);
    // }

    // async sendReportTimeoutUpgrade(msgId, payload = [], timeout = 2000) {
    //     this.sendReportUpgrade(msgId, payload);
    //     const time = new Date().getTime();
    //     // console.log('sendReportTimeout', Protocol.hex8(msgId), payload);
    //     while ((new Date().getTime() - time) < timeout) {
    //         if (this._reports.has(msgId)) {
    //             let report = this._reports.get(msgId);
    //             // console.log('sendReportTimeout recv', report);
    //             this._reports.delete(msgId);
    //             return report;
    //         }
    //         await new Promise(resolve => setTimeout(resolve, 20));
    //     }
    //     return null;
    // }
    //#endregion

    async isMcu() {
        const report = await this.sendReportTimeout(Protocol.MESSAGES.R_ACTIVATION_TIME);
        return report != null;
    }


    toString() {
        return `<Glasses deviceName=${this._device.productName} vid=${this._device.vendorId} pid=${this._device.vendorId}>`;
    }
}