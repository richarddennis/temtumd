"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const secp256k1 = require("secp256k1");
const transaction_1 = require("../blockchain/transaction");
const txOut_1 = require("../blockchain/txOut");
const helpers_1 = require("../util/helpers");
const logger_1 = require("../util/logger");
class Wallet {
    static generateAddress() {
        const privateKey = crypto.randomBytes(32);
        const address = secp256k1.publicKeyCreate(privateKey);
        return {
            privateKey: privateKey.toString('hex'),
            address: address.toString('hex')
        };
    }
    static signInputs(id, inputs, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                for (let i = 0, length = inputs.length; i < length; i++) {
                    const input = inputs[i];
                    input.sign(id, privateKey);
                    yield helpers_1.default.setImmediatePromise();
                }
                return inputs;
            }
            catch (error) {
                const message = `Error signing inputs ${inputs}: ${error}`;
                logger_1.default.error(message);
                throw new Error(message);
            }
        });
    }
    constructor(blockchain) {
        this.blockchain = blockchain;
    }
    createTransaction(address, receiverAddress, amount, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check private/public address conformity
            /*const createdAddress = secp256k1.publicKeyCreate(Buffer.from(privateKey, 'hex'));
        
            if (createdAddress.toString('hex') !== address) {
              const message = `Wrong pair address: ${address} key: ${privateKey}`;
        
              logger.error(message);
        
              throw new Error(message);
            }*/
            const inputs = this.blockchain.getUnspentTransactionsForAddress(address);
            const totalAmountOfUtxo = helpers_1.default.sumArrayObjects(inputs, 'amount');
            const changeAmount = totalAmountOfUtxo - amount;
            const outputs = [];
            // Add target receiver
            outputs.push(new txOut_1.default(receiverAddress, amount));
            if (changeAmount < 0) {
                throw new Error('The sender does not have enough to pay for the transaction.');
            }
            // Add change amount
            if (changeAmount > 0) {
                outputs.push(new txOut_1.default(address, changeAmount));
            }
            try {
                const tx = new transaction_1.default('regular', inputs, outputs);
                yield Wallet.signInputs(tx.id, inputs, privateKey);
                return tx;
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.default = Wallet;
//# sourceMappingURL=index.js.map