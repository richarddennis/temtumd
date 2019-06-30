"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const secp256k1 = require("secp256k1");
const logger_1 = require("../util/logger");
/**
 * @class
 */
class TxIn {
    static fromJS(json) {
        const { txOutIndex, txOutId, amount, address, signature } = json;
        return new TxIn(txOutIndex, txOutId, amount, address, signature);
    }
    constructor(txOutIndex, txOutId, amount, address, signature) {
        this.txOutIndex = txOutIndex;
        if (txOutId) {
            this.txOutId = txOutId;
        }
        if (amount) {
            this.amount = amount;
        }
        if (address) {
            this.address = address;
        }
        if (signature) {
            this.signature = signature;
        }
    }
    verifySignature(id) {
        const verified = secp256k1.verify(Buffer.from(id, 'hex'), Buffer.from(this.signature, 'hex'), Buffer.from(this.address, 'hex'));
        if (!verified) {
            const message = `Input ${JSON.stringify(this)} has wrong signature.`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    sign(id, privateKey) {
        const message = secp256k1.sign(Buffer.from(id, 'hex'), Buffer.from(privateKey, 'hex'));
        const signature = message.signature;
        this.signature = signature.toString('hex');
    }
    equals(input) {
        return (this.txOutIndex === input.txOutIndex &&
            this.txOutId === input.txOutId &&
            this.amount === input.amount &&
            this.address === input.address);
    }
}
exports.default = TxIn;
//# sourceMappingURL=txIn.js.map