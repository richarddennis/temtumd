"use strict";
/*eslint @typescript-eslint/camelcase: ["error", {properties: "never"}]*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("../shared");
class RpcController {
    constructor(shared) {
        this.shared = shared;
    }
    getMethods() {
        return {
            create_address: () => shared_1.default.addressCreate(),
            send_transaction: (req) => {
                const { txHex } = req.body.params;
                return shared_1.default.transactionSend(txHex);
            },
            create_transaction: (req) => __awaiter(this, void 0, void 0, function* () {
                const { from, to, amount, privateKey } = req.body.params;
                return yield this.shared.transactionCreate(from, to, amount, privateKey);
            }),
            get_transaction: (req) => __awaiter(this, void 0, void 0, function* () {
                const { id } = req.body.params;
                return yield this.shared.getTransactionById(id);
            }),
            get_block: (req) => __awaiter(this, void 0, void 0, function* () {
                const { index, hash } = req.body.params;
                if (hash) {
                    return yield this.shared.viewBlockByHash(hash);
                }
                if (index) {
                    return yield this.shared.getBlockByIndex(index);
                }
            }),
            get_block_last: () => __awaiter(this, void 0, void 0, function* () {
                return yield this.shared.getLastBlock();
            }),
            get_balance: (req) => {
                const { address } = req.body.params;
                return this.shared.getBalanceForAddress(address);
            },
            get_unspents: (req) => {
                const { address } = req.body.params;
                return this.shared.getUnspentTransactionsForAddress(address);
            },
            get_statistic: () => __awaiter(this, void 0, void 0, function* () {
                return this.shared.getStatistic();
            })
        };
    }
}
exports.default = RpcController;
//# sourceMappingURL=controller.js.map