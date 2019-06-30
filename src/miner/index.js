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
const block_1 = require("../blockchain/block");
const transaction_1 = require("../blockchain/transaction");
const txIn_1 = require("../blockchain/txIn");
const txOut_1 = require("../blockchain/txOut");
const config_1 = require("../config");
const beacon = require("../util/beacon");
const logger_1 = require("../util/logger");
/**
 * @class
 */
class Miner {
    constructor(mempool, blockchain) {
        this.lastBlock = {};
        this.blockchain = blockchain;
        this.mempool = mempool;
    }
    static createCoinbaseTransaction(index) {
        const inputs = [new txIn_1.default(index)];
        const outputs = [new txOut_1.default('', config_1.default.MINING_REWARD)];
        return new transaction_1.default('coinbase', inputs, outputs);
    }
    generateNextBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            const previousBlock = yield this.blockchain.getLastBlock();
            const index = previousBlock.index + 1;
            const previousHash = previousBlock.hash;
            const selectedTxs = this.mempool.getTransactionsForBlock();
            const coinbaseTx = Miner.createCoinbaseTransaction(index);
            logger_1.default.info(`Selected ${selectedTxs.length} candidate transactions.`);
            let beaconData = beacon.getCurrentBeaconData();
            const transactions = [coinbaseTx, ...selectedTxs];
            if (!beaconData.pulse) {
                beaconData = {
                    pulse: {
                        pulseIndex: previousBlock.beaconIndex,
                        outputValue: previousBlock.beaconData
                    }
                };
            }
            return new block_1.default(index, previousHash, transactions, beaconData.pulse.pulseIndex, beaconData.pulse.outputValue);
        });
    }
}
exports.default = Miner;
//# sourceMappingURL=index.js.map