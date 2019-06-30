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
const axios_1 = require("axios");
const index_1 = require("../wallet/index");
class Shared {
    static transactionSend(txHex) {
        return new Promise((resolve, reject) => {
            axios_1.default
                .post(`${process.env.TRANSACTIONS_POOL}/transaction/send`, {
                txHex
            })
                .then((res) => {
                resolve(res.data);
            })
                .catch((err) => {
                reject(err);
            });
        });
    }
    static addressCreate() {
        return index_1.default.generateAddress();
    }
    constructor(blockchain, wallet) {
        this.blockchain = blockchain;
        this.wallet = wallet;
    }
    search(query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Number(query)) {
                const block = yield this.blockchain.getBlockByIndex(query);
                return { block };
            }
            try {
                const block = this.blockchain.getBlockByHash(Buffer.from(query, 'hex'));
                if (block) {
                    return { block };
                }
            }
            catch (err) {
                const tx = this.blockchain.getTransactionById(query);
                if (tx) {
                    return { transaction: tx };
                }
            }
            return { message: 'Not Found' };
        });
    }
    transactionCreate(from, to, amount, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield this.wallet.createTransaction(from, to, amount, privateKey);
            const txHex = Buffer.from(JSON.stringify(transaction)).toString('hex');
            return yield Shared.transactionSend(txHex);
        });
    }
    getTransactionById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.blockchain.getTransactionById(id);
        });
    }
    viewBlockByHash(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.blockchain.viewBlockByHash(hash);
        });
    }
    getBlockByIndex(index) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.blockchain.getBlockByIndex(index, true);
        });
    }
    getLastBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.blockchain.getLastBlock();
        });
    }
    getBalanceForAddress(address) {
        return this.blockchain.getBalanceForAddress(address);
    }
    getUnspentTransactionsForAddress(address) {
        return this.blockchain.getUnspentTransactionsForAddress(address);
    }
    getStatistic() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.blockchain.getStatistic();
        });
    }
}
exports.default = Shared;
//# sourceMappingURL=shared.js.map