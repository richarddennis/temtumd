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
const config_1 = require("../config");
const constant_1 = require("../constant");
const db_1 = require("../platform/db");
const redis_1 = require("../redis");
const helpers_1 = require("../util/helpers");
class BlockSave {
    static buildUnspentKey(address, output) {
        const params = [constant_1.default.UNSPENT_PREFIX + address];
        params.push(output.txOutId);
        params.push(output.txOutIndex);
        return Buffer.from(params.join('/'));
    }
    static populateUnspentInputs(txOutId, outputs, unspentInputs) {
        for (let i = 0, length = outputs.length; i < length; i++) {
            const output = outputs[i];
            if (!output.address || isNaN(output.amount)) {
                continue;
            }
            const key = output.address + txOutId;
            unspentInputs[key] = {
                txOutId,
                txOutIndex: i,
                amount: output.amount,
                address: output.address
            };
        }
    }
    constructor() {
        this.initDBs();
        this.redis = new redis_1.default();
    }
    initDBs() {
        const options = {
            noMetaSync: true,
            noSync: true
        };
        this.blockchainDB = new db_1.default(config_1.default.BLOCKCHAIN_DATABASE, options);
        this.utxoDB = new db_1.default(config_1.default.UTXO_DATABASE, options);
    }
    init() {
        process.on('message', this.messageHandler.bind(this));
    }
    messageHandler(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (msg.type) {
                case 'add':
                    const { block } = msg;
                    try {
                        yield this.saveBlock(block);
                        process.send({ type: 'saved' });
                        setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                            yield this.redis.executeCommands();
                        }));
                    }
                    catch (err) {
                        process.send({ type: 'error' });
                    }
                    break;
            }
        });
    }
    populateTransactions(block, preparedData) {
        return __awaiter(this, void 0, void 0, function* () {
            const unspentInputs = {};
            const spentInputs = {};
            const blockchainTxn = this.blockchainDB.initTxn();
            const length = block.data.length;
            let totalMoneyTransferredInBlock = 0;
            for (let i = 0; i < length; i++) {
                const tx = block.data[i];
                const txKey = Buffer.concat([
                    Buffer.from(constant_1.default.TRANSACTION_PREFIX),
                    Buffer.from(tx.id, 'hex')
                ]);
                const info = {
                    height: block.index,
                    index: i
                };
                preparedData.blockData.push([
                    this.blockchainDB.DBI,
                    txKey,
                    Buffer.from(JSON.stringify(info))
                ]);
                if (tx.type === 'regular' || block.index === 0) {
                    if (length - i <= config_1.default.TX_PER_PAGE) {
                        this.redis.pushTransactionCommand(tx);
                    }
                    totalMoneyTransferredInBlock += tx.txOuts[0].amount;
                    BlockSave.populateUnspentInputs(tx.id, tx.txOuts, unspentInputs);
                    this.populateSpentInputs(tx.txIns, spentInputs, preparedData);
                }
            }
            this.redis.pushTransactionTrimCommand();
            if (length > 1) {
                for (const item in unspentInputs) {
                    if (!spentInputs[item]) {
                        const address = helpers_1.default.toShortAddress(unspentInputs[item].address);
                        const unspentKey = BlockSave.buildUnspentKey(address, unspentInputs[item]);
                        const unspentData = Buffer.from(JSON.stringify(unspentInputs[item]));
                        preparedData.utxoData.push([
                            this.blockchainDB.DBI,
                            unspentKey,
                            unspentData
                        ]);
                    }
                }
                const stat = this._getStatistic(blockchainTxn);
                const statKey = Buffer.from(constant_1.default.BLOCKCHAIN_STAT);
                stat.totalMoneyTransferred += totalMoneyTransferredInBlock;
                stat.totalTxs += block.index ? length - 1 : length;
                preparedData.blockData.push([
                    this.blockchainDB.DBI,
                    statKey,
                    Buffer.from(JSON.stringify(stat))
                ]);
            }
            blockchainTxn.abort();
        });
    }
    populateSpentInputs(inputs, spentInputs, preparedData) {
        for (let i = 0, length = inputs.length; i < length; i++) {
            const input = inputs[i];
            if (!input.address || isNaN(input.amount)) {
                continue;
            }
            const key = input.address + input.txOutId;
            spentInputs[key] = 1;
            const utxo = {
                txOutId: input.txOutId,
                txOutIndex: input.txOutIndex,
                amount: input.amount,
                address: input.address
            };
            const address = helpers_1.default.toShortAddress(utxo.address);
            const unspentKey = BlockSave.buildUnspentKey(address, utxo);
            preparedData.utxoData.push([this.utxoDB.DBI, unspentKey]);
        }
    }
    _getStatistic(txn) {
        const key = Buffer.from(constant_1.default.BLOCKCHAIN_STAT);
        const data = this.blockchainDB.get(txn, key);
        if (data !== null) {
            return helpers_1.default.JSONToObject(data.toString());
        }
        return {
            totalMoneyTransferred: 0,
            totalTxs: 0
        };
    }
    saveBlock(block) {
        const preparedData = {
            blockData: [],
            utxoData: []
        };
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const blockKey = Buffer.concat([
                Buffer.from(constant_1.default.BLOCK_PREFIX),
                Buffer.from(block.hash, 'hex'),
                Buffer.from(constant_1.default.BLOCK_SUFFIX)
            ]);
            const blockIndexKey = Buffer.concat([
                Buffer.from(constant_1.default.CHAIN_PREFIX),
                helpers_1.default.writeVarInt(block.index)
            ]);
            const blockTxKey = Buffer.concat([
                Buffer.from(constant_1.default.BLOCK_TX_PREFIX),
                Buffer.from(block.hash, 'hex')
            ]);
            const compressedTxs = Buffer.from(block.data, 'base64');
            block.data = yield helpers_1.default.decompressData(compressedTxs, 'array');
            const blockHeader = JSON.stringify(block_1.default.createBlockHeader(block));
            preparedData.blockData.push([
                this.blockchainDB.DBI,
                blockKey,
                Buffer.from(blockHeader)
            ]);
            preparedData.blockData.push([
                this.blockchainDB.DBI,
                blockTxKey,
                compressedTxs
            ]);
            preparedData.blockData.push([
                this.blockchainDB.DBI,
                blockIndexKey,
                Buffer.from(block.hash, 'hex')
            ]);
            yield this.populateTransactions(block, preparedData);
            Promise.all([
                this._saveBlockData(preparedData.blockData),
                this._saveUtxoData(preparedData.utxoData)
            ])
                .then(() => {
                this.redis.pushBlockCommand(blockHeader);
                this.redis.pushBlockTrimCommand();
                resolve(true);
            })
                .catch((error) => {
                reject(error);
            });
        }));
    }
    _saveBlockData(data) {
        return new Promise((resolve, reject) => {
            this.blockchainDB.batchWrite(data, {
                ignoreNotFound: true
            }, (error) => {
                if (error) {
                    return reject(error);
                }
                return resolve(true);
            });
        });
    }
    _saveUtxoData(data) {
        return new Promise((resolve, reject) => {
            this.utxoDB.batchWrite(data, {
                ignoreNotFound: true
            }, (error) => {
                if (error) {
                    return reject(error);
                }
                return resolve(true);
            });
        });
    }
    getTransactionIndex(tid, txn) {
        const key = Buffer.concat([
            Buffer.from(constant_1.default.TRANSACTION_PREFIX),
            tid
        ]);
        return this.blockchainDB.get(txn, key);
    }
}
const blockSave = new BlockSave();
blockSave.init();
//# sourceMappingURL=save.js.map