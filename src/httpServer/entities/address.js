"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("../shared");
class AdressEntity {
    constructor(shared) {
        this.shared = shared;
    }
    addressCreate() {
        return shared_1.default.addressCreate();
    }
    addressUnspent(address) {
        const utxo = this.shared.getUnspentTransactionsForAddress(address);
        return { unspentTxOuts: utxo };
    }
    addressBalance(address) {
        const balance = this.shared.getBalanceForAddress(address);
        return { balance };
    }
}
exports.default = AdressEntity;
//# sourceMappingURL=address.js.map