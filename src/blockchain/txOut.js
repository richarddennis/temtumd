"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @class
 */
class TxOut {
    static fromJS(json) {
        const { address, amount } = json;
        return new TxOut(address, amount);
    }
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}
exports.default = TxOut;
//# sourceMappingURL=txOut.js.map