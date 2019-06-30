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
const customErrors_1 = require("../../errors/customErrors");
const shared_1 = require("../shared");
class TransactionEntity {
    constructor(blockchain, node, shared) {
        this.node = node;
        this.shared = shared;
        this.blockchain = blockchain;
    }
    transactionCreate(from, to, amount, privateKey) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.node.isNodeReady()) {
                throw new customErrors_1.default.BadRequest('Failed to create a transaction');
            }
            try {
                return yield this.shared.transactionCreate(from, to, amount, privateKey);
            }
            catch (error) {
                throw new customErrors_1.default.BadRequest('Failed to create a transaction');
            }
        });
    }
    transactionSend(txHex) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.node.isNodeReady()) {
                throw new customErrors_1.default.BadRequest('Failed to create a transaction');
            }
            try {
                const transaction = yield shared_1.default.transactionSend(txHex);
                return { transaction };
            }
            catch (error) {
                throw new customErrors_1.default.BadRequest('Failed to create a transaction');
            }
        });
    }
    transactionId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.shared.getTransactionById(id);
        });
    }
    getLastTransactionList() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.blockchain.getLastTransactionList();
        });
    }
}
exports.default = TransactionEntity;
//# sourceMappingURL=transaction.js.map