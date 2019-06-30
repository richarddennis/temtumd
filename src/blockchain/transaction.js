"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const config_1 = require("../config");
const helpers_1 = require("../util/helpers");
const logger_1 = require("../util/logger");
const transaction_1 = require("./schemas/transaction");
const txIn_1 = require("./txIn");
const txOut_1 = require("./txOut");
/**
 * @class
 */
class Transaction {
    static fromJS(json) {
        const inputs = json.txIns.map((input) => txIn_1.default.fromJS(input));
        const outputs = json.txOuts.map((output) => txOut_1.default.fromJS(output));
        return new Transaction(json.type, inputs, outputs, json.timestamp, json.id);
    }
    constructor(type, txIns, txOuts, timestamp, id) {
        this.type = type;
        this.txIns = txIns;
        this.txOuts = txOuts;
        this.timestamp = timestamp ? timestamp : helpers_1.default.getCurrentTimestamp();
        this.id = id ? id : this.hash;
    }
    get hash() {
        const inputs = JSON.stringify(this.txIns, (key, value) => {
            if (key === 'signature') {
                return undefined;
            }
            return value;
        });
        const outputs = JSON.stringify(this.txOuts);
        return crypto
            .createHash('sha256')
            .update(this.type + this.timestamp + inputs + outputs)
            .digest('hex');
    }
    get inputTotal() {
        return this.txIns.reduce((total, input) => total + input.amount, 0);
    }
    get outputTotal() {
        return this.txOuts.reduce((total, output) => total + output.amount, 0);
    }
    isValidCoinbase() {
        if (this.txIns.length === 1 &&
            this.txOuts.length === 1 &&
            this.txOuts[0].address === '' &&
            this.txOuts[0].amount === config_1.default.MINING_REWARD) {
            return true;
        }
        const message = `Invalid coinbase transaction.`;
        logger_1.default.error(message);
        throw new Error(message);
    }
    isValidTransaction() {
        try {
            this.isValidSchema();
            this.isValidHash();
            if (this.type === 'coinbase') {
                this.isValidCoinbase();
                return true;
            }
            this.isInputsMoreThanOutputs();
            this.verifyInputSignatures();
            return true;
        }
        catch (err) {
            throw err;
        }
    }
    isValidSchema() {
        if (!transaction_1.default.validate(this)) {
            const message = `Invalid Transaction structure.`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    isValidHash() {
        if (this.id !== this.hash) {
            const message = `Invalid transaction id.`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    isInputsMoreThanOutputs() {
        const inputTotal = this.inputTotal;
        const outputTotal = this.outputTotal;
        if (inputTotal < outputTotal) {
            const message = `Insufficient balance: inputs ${inputTotal} < outputs ${outputTotal}`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    verifyInputSignatures() {
        try {
            this.txIns.forEach((input) => {
                return input.verifySignature(this.id);
            });
        }
        catch (error) {
            throw error;
        }
    }
}
exports.default = Transaction;
//# sourceMappingURL=transaction.js.map