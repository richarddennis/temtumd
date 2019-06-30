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
const txIn_1 = require("../blockchain/txIn");
const helpers_1 = require("../util/helpers");
const logger_1 = require("../util/logger");
class Mempool {
    constructor(emitter) {
        this.transactions = [];
        this.transactionsUnspent = {};
        this.transactionsUnspentAddresses = {};
        this.transactionsSpent = {};
        this.transactionsSpentAddresses = {};
        this.emitter = emitter;
    }
    addTransaction(transaction, emit = true) {
        try {
            transaction.isValidTransaction();
            this.isTransactionDoubleSpent(transaction);
            this.transactions.push(transaction);
            this.updatePoolCache(transaction);
            if (process.env.NODE_ENV === 'dev') {
                logger_1.default.info(`Transaction added to pool: ${JSON.stringify(transaction)}`);
            }
            if (emit) {
                this.emitter.emit('transaction_added', transaction);
            }
            return transaction;
        }
        catch (error) {
            throw error;
        }
    }
    getTransactions() {
        return this.transactions;
    }
    getTransactionsForBlock() {
        if (!this.transactions.length) {
            return [];
        }
        const txs = this.transactions.slice();
        this.transactions = [];
        return txs;
    }
    isTransactionDoubleSpent(transaction) {
        const isDoubleSpent = transaction.txIns.find((input) => {
            return this.transactionsSpent[input.txOutId + input.txOutIndex];
        });
        if (isDoubleSpent) {
            const message = `Transaction ${JSON.stringify(transaction)} is double spent.`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    removeTransactions(txs) {
        return __awaiter(this, void 0, void 0, function* () {
            const txsLen = this.transactions.length;
            const isEmptySpentTxs = helpers_1.default.isEmptyObject(this.transactionsSpent);
            const isEmptyUnspentTxs = helpers_1.default.isEmptyObject(this.transactionsUnspent);
            if (!txsLen && isEmptySpentTxs && isEmptyUnspentTxs) {
                return;
            }
            for (let i = 0, length = txs.length; i < length; i++) {
                const tx = txs[i];
                if (tx.type === 'regular') {
                    if (txsLen) {
                        const found = this.transactions.findIndex((item) => {
                            return item.id === tx.id;
                        });
                        if (found !== -1) {
                            this.transactions.splice(found, 1);
                        }
                    }
                    if (!isEmptySpentTxs) {
                        this.removePoolCacheSpent(tx.txIns);
                    }
                    if (!isEmptyUnspentTxs) {
                        this.removePoolCacheUnspent(tx.id, tx.txOuts);
                    }
                }
                yield helpers_1.default.setImmediatePromise();
            }
        });
    }
    updatePoolCache(tx) {
        this.updatePoolCacheSpent(tx.txIns);
        this.updatePoolCacheUnspent(tx.id, tx.txOuts);
    }
    removePoolCacheSpent(inputs) {
        for (let i = 0, length = inputs.length; i < length; i++) {
            const input = inputs[i];
            const key = input.txOutId + input.txOutIndex;
            delete this.transactionsSpent[key];
            if (this.transactionsSpentAddresses[input.address]) {
                delete this.transactionsSpentAddresses[input.address][key];
            }
        }
    }
    removePoolCacheUnspent(txId, outputs) {
        for (let i = 0, length = outputs.length; i < length; i++) {
            const output = outputs[i];
            const key = txId + i;
            delete this.transactionsUnspent[key];
            if (this.transactionsUnspentAddresses[output.address]) {
                delete this.transactionsUnspentAddresses[output.address][key];
            }
        }
    }
    updatePoolCacheUnspent(txId, outputs) {
        for (let i = 0, length = outputs.length; i < length; i++) {
            const output = outputs[i];
            const key = txId + i;
            const input = new txIn_1.default(i, txId, output.amount, output.address);
            this.transactionsUnspent[key] = input;
            if (!this.transactionsUnspentAddresses[output.address]) {
                this.transactionsUnspentAddresses[output.address] = {};
            }
            this.transactionsUnspentAddresses[output.address][key] = input;
        }
    }
    updatePoolCacheSpent(inputs) {
        for (let i = 0, length = inputs.length; i < length; i++) {
            const input = inputs[i];
            const key = input.txOutId + input.txOutIndex;
            if (this.transactionsUnspent[key]) {
                delete this.transactionsUnspent[key];
                delete this.transactionsUnspentAddresses[input.address][key];
            }
            const spent = {
                txOutId: input.txOutId,
                txOutIndex: input.txOutIndex,
                amount: input.amount,
                address: input.address
            };
            this.transactionsSpent[key] = spent;
            if (!this.transactionsSpentAddresses[spent.address]) {
                this.transactionsSpentAddresses[spent.address] = {};
            }
            this.transactionsSpentAddresses[spent.address][key] = spent;
        }
    }
}
exports.default = Mempool;
//# sourceMappingURL=index.js.map