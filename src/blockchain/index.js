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
const child_process_1 = require("child_process");
const path = require("path");
const config_1 = require("../config");
const constant_1 = require("../constant");
const db_1 = require("../platform/db");
const redis_1 = require("../redis");
const helpers_1 = require("../util/helpers");
const logger_1 = require("../util/logger");
const block_1 = require("./block");
const block_2 = require("./schemas/block");
const transaction_1 = require("./transaction");
const txIn_1 = require("./txIn");
/**
 * @class
 */
class Blockchain {
    constructor(emitter, queue) {
        this.lastBlock = null;
        this.blockQueue = {};
        this.emitter = emitter;
        this.queue = queue;
        this.redis = new redis_1.default();
        this.initDBs();
        this.initWorker();
        this.blockSaveHandler();
    }
    /**
     * @param address
     * @param output
     * @returns {Buffer}
     */
    static buildUnspentKey(address, output) {
        const params = [constant_1.default.UNSPENT_PREFIX + address];
        params.push(helpers_1.default.toAscendingKey(output.blockIndex));
        params.push(output.txOutId);
        params.push(output.txOutIndex);
        return Buffer.from(params.join('/'));
    }
    static calcEndPagePos(start, count, perPage) {
        const total = count - start;
        if (total > Number(perPage)) {
            return Number(perPage);
        }
        return total;
    }
    static isValidIndex(newBlock, previousBlock) {
        const previousIndex = previousBlock.index;
        const index = newBlock.index;
        if (previousIndex + 1 !== index) {
            const message = `Previous index ${previousIndex} should be 1 less than index ${index}`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    static isValidPreviousHash(newBlock, previousBlock) {
        const previousHash = previousBlock.hash;
        const blockPreviousHash = newBlock.previousHash;
        if (previousHash !== blockPreviousHash) {
            const message = `Previous hash ${previousHash} should equal next previous hash ${blockPreviousHash}`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    static isValidHash(newBlock) {
        const calculatedHash = newBlock.calculateHash();
        const hash = newBlock.hash;
        if (calculatedHash !== hash) {
            const message = `Calculated hash ${calculatedHash} not equal hash ${hash}`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    static isValidSchema(newBlock) {
        if (!block_2.default.validate(newBlock)) {
            const message = `Invalid block structure.`;
            logger_1.default.error(message);
            throw new Error(`Invalid block structure.`);
        }
    }
    static isValidBlock(newBlock, previousBlock) {
        try {
            Blockchain.isValidIndex(newBlock, previousBlock);
            Blockchain.isValidPreviousHash(newBlock, previousBlock);
            Blockchain.isValidHash(newBlock);
            Blockchain.isValidSchema(newBlock);
        }
        catch (error) {
            const message = `Invalid Block Error: ${error}`;
            logger_1.default.error(message);
            throw new Error(message);
        }
    }
    static isValidBlockTxs(txs) {
        for (let i = 0, length = txs.length; i < length; i++) {
            const transaction = transaction_1.default.fromJS(txs[i]);
            transaction.isValidTransaction();
        }
    }
    initWorker() {
        this.worker = child_process_1.fork(path.join(process.cwd(), 'src/workers/save.js'));
        this.worker.on('message', (msg) => {
            this.saveWorkerMessageHandler(msg);
        });
    }
    initDBs() {
        const options = {
            noMetaSync: true,
            noSync: true
        };
        this.blockchainDB = new db_1.default(config_1.default.BLOCKCHAIN_DATABASE, options);
        this.utxoDB = new db_1.default(config_1.default.UTXO_DATABASE, options);
        this.blockchainReader = this.blockchainDB.initTxn();
        this.utxoReader = this.utxoDB.initTxn();
    }
    updateReaders() {
        this.blockchainReader.reset();
        this.blockchainReader.renew();
        this.utxoReader.reset();
        this.utxoReader.renew();
    }
    /**
     * @param {number} offset
     * @returns {Object} {blocks: Block[]; pages: number}
     */
    getBlockList(offset = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const blocks = [];
            const prefix = Buffer.from(constant_1.default.CHAIN_PREFIX);
            const cursor = this.blockchainDB.initCursor(this.blockchainReader);
            cursor.goToRange(this.getLastKey(prefix));
            const lastKey = cursor.goToPrev();
            if (!lastKey) {
                cursor.close();
                return { blocks };
            }
            const count = helpers_1.default.readVarInt(lastKey.slice(prefix.length)).value + 1;
            const start = Number(config_1.default.BLOCKS_PER_PAGE) * offset;
            const startKey = Buffer.concat([
                prefix,
                Buffer.from(helpers_1.default.writeVarInt(count - start))
            ]);
            const pages = Math.ceil(count / Number(config_1.default.BLOCKS_PER_PAGE));
            const pos = Blockchain.calcEndPagePos(start, count, config_1.default.BLOCKS_PER_PAGE);
            const blockHash = yield this.redis.getBlockCache();
            if (offset === 0 && blockHash.length >= pos) {
                cursor.close();
                return { blocks: blockHash, pages };
            }
            cursor.goToRange(startKey);
            for (let i = 0; i < pos; i++) {
                const key = this.blockchainDB.get(this.blockchainReader, cursor.goToPrev());
                const block = yield this.getBlockByHash(key);
                if (block) {
                    blocks.push(block);
                }
            }
            cursor.close();
            return { blocks, pages };
        });
    }
    getStatistic() {
        return __awaiter(this, void 0, void 0, function* () {
            const stat = this._getStatistic();
            stat.lastBlockIndex = yield this.getLastBlockIndex();
            return stat;
        });
    }
    updateLastBlock(block) {
        this.lastBlock = block_1.default.createBlockHeader(block);
    }
    getLastKey(prefix) {
        const maxKeySize = this.blockchainDB.getMaxkeysize();
        if (prefix.length < maxKeySize) {
            return Buffer.concat([
                prefix,
                Buffer.alloc(maxKeySize - prefix.length, 0xff)
            ]);
        }
        return prefix;
    }
    getBlockByIndex(index, includeTx = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const blockHash = this.getBlockHashByIndex(index);
            let block = null;
            if (blockHash) {
                block = yield this.getBlockByHash(blockHash, includeTx);
            }
            return block;
        });
    }
    getBlockHashByIndex(index) {
        return this.blockchainDB.get(this.blockchainReader, Buffer.concat([
            Buffer.from(constant_1.default.CHAIN_PREFIX),
            helpers_1.default.writeVarInt(index)
        ]));
    }
    getBlockTxs(hash) {
        const key = Buffer.concat([Buffer.from(constant_1.default.BLOCK_TX_PREFIX), hash]);
        return this.blockchainDB.get(this.blockchainReader, key);
    }
    /**
     * @param hash
     * @returns {Promise<Block>}
     */
    viewBlockByHash(hash) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = Buffer.from(hash, 'hex');
            return yield this.getBlockByHash(key, true);
        });
    }
    /**
     * @param {Buffer} hash
     * @param {boolean} includeTxs
     * @param {"buffer" | "array"} txsResultType
     * @returns {Promise<Block>}
     */
    getBlockByHash(hash, includeTxs = false, txsResultType = 'array') {
        return __awaiter(this, void 0, void 0, function* () {
            const key = Buffer.concat([
                Buffer.from(constant_1.default.BLOCK_PREFIX),
                hash,
                Buffer.from(constant_1.default.BLOCK_SUFFIX)
            ]);
            const data = this.blockchainDB.get(this.blockchainReader, key);
            if (!data) {
                return null;
            }
            const block = helpers_1.default.JSONToObject(data.toString());
            if (includeTxs) {
                const txs = this.getBlockTxs(hash);
                switch (txsResultType) {
                    case 'array':
                        block.data = yield helpers_1.default.decompressData(txs, txsResultType);
                        break;
                    case 'base64':
                        block.data = txs.toString('base64');
                        break;
                }
                delete block.txCount;
            }
            return block;
        });
    }
    _getStatistic() {
        const key = Buffer.from(constant_1.default.BLOCKCHAIN_STAT);
        const data = this.blockchainDB.get(this.blockchainReader, key);
        if (data !== null) {
            return helpers_1.default.JSONToObject(data.toString());
        }
        return {
            totalMoneyTransferred: 0,
            totalTxs: 0
        };
    }
    /**
     * @returns {BlockHeader}
     */
    getLastBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lastBlock) {
                return this.lastBlock;
            }
            let block = null;
            const prefix = Buffer.from(constant_1.default.CHAIN_PREFIX);
            const cursor = this.blockchainDB.initCursor(this.blockchainReader);
            if (cursor.goToRange(this.getLastKey(prefix))) {
                const data = cursor.goToPrev();
                if (data) {
                    const blockHash = this.blockchainDB.get(this.blockchainReader, data);
                    block = yield this.getBlockByHash(blockHash);
                    this.updateLastBlock(block);
                }
            }
            cursor.close();
            return block;
        });
    }
    getLastBlockIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lastBlock) {
                return this.lastBlock.index;
            }
            const block = yield this.getLastBlock();
            return block ? block.index : null;
        });
    }
    resetLastBlock() {
        this.lastBlock = null;
    }
    deleteBlockByIndex(index) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const indexKey = Buffer.concat([
                Buffer.from(constant_1.default.CHAIN_PREFIX),
                helpers_1.default.writeVarInt(index)
            ]);
            const hash = this.blockchainDB.get(this.blockchainReader, indexKey);
            const blockKey = Buffer.concat([
                Buffer.from(constant_1.default.BLOCK_PREFIX),
                hash,
                Buffer.from(constant_1.default.BLOCK_SUFFIX)
            ]);
            const data = this.blockchainDB.get(this.blockchainReader, blockKey);
            if (!data) {
                return resolve(true);
            }
            const block = helpers_1.default.JSONToObject(data.toString());
            const blockTxKey = Buffer.concat([
                Buffer.from(constant_1.default.BLOCK_TX_PREFIX),
                Buffer.from(block.hash, 'hex')
            ]);
            const txRaw = this.blockchainDB.get(this.blockchainReader, blockTxKey);
            const txList = (yield helpers_1.default.decompressData(txRaw, 'array'));
            const blockData = [];
            blockData.push([this.blockchainDB.DBI, blockKey]);
            blockData.push([this.blockchainDB.DBI, indexKey]);
            txList.forEach((tx) => {
                const txKey = Buffer.concat([
                    Buffer.from(constant_1.default.TRANSACTION_PREFIX),
                    Buffer.from(tx.id, 'hex')
                ]);
                blockData.push([this.blockchainDB.DBI, txKey]);
                // @todo may need to replace loop
                tx.txOuts.forEach((txOut) => {
                    if (txOut.address !== '') {
                        const address = helpers_1.default.toShortAddress(txOut.address);
                        const unspentKey = Blockchain.buildUnspentKey(address, txOut);
                        blockData.push([this.blockchainDB.DBI, unspentKey]);
                    }
                });
            });
            this.blockchainDB.batchWrite(blockData, {}, (error) => __awaiter(this, void 0, void 0, function* () {
                this.updateReaders();
                this.resetLastBlock();
                const lastBlock = yield this.getLastBlock();
                this.updateLastBlock(lastBlock);
                if (error) {
                    return reject(error);
                }
                return resolve(true);
            }));
        }));
    }
    getUnspentOutputsByAddress(address) {
        const utxo = [];
        const shortAddress = helpers_1.default.toShortAddress(address);
        const unspentKey = Buffer.from(constant_1.default.UNSPENT_PREFIX + shortAddress + '/');
        const cursor = this.utxoDB.initCursor(this.utxoReader);
        for (let found = cursor.goToRange(unspentKey); found !== null; found = cursor.goToNext()) {
            if (Buffer.compare(unspentKey, found.slice(0, unspentKey.length))) {
                break;
            }
            const output = this.utxoDB.get(this.utxoReader, found);
            if (!output) {
                continue;
            }
            const data = helpers_1.default.JSONToObject(output.toString());
            const input = new txIn_1.default(data.txOutIndex, data.txOutId, data.amount, data.address, data.signature);
            utxo.push(input);
        }
        cursor.close();
        return utxo;
    }
    /**
     * @param {string} tid
     * @returns {boolean}
     */
    isTransactionInBlockchain(tid) {
        return !!this.getTransactionIndex(Buffer.from(tid, 'hex'));
    }
    getTransactionById(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getTransactionFromBlockById(tid);
        });
    }
    /**
     * @param {string} tid
     * @returns {null | RawTx}
     */
    getTransactionFromBlockById(tid) {
        return __awaiter(this, void 0, void 0, function* () {
            const txInfo = this.getTransactionIndex(Buffer.from(tid, 'hex'));
            if (txInfo) {
                const { height, index } = helpers_1.default.JSONToObject(txInfo.toString());
                const blockHash = this.getBlockHashByIndex(height);
                if (blockHash) {
                    const txsBuf = this.getBlockTxs(blockHash);
                    const txs = yield helpers_1.default.decompressData(txsBuf, 'array');
                    if (txs[index].id === tid) {
                        return txs[index];
                    }
                }
            }
            return null;
        });
    }
    /**
     * Getting a list of last transactions (Only regular transactions)
     * @returns {Object} {transactionList: Transaction[]}
     */
    getLastTransactionList() {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionList = yield this.redis.getTransactionCache();
            return { transactionList };
        });
    }
    saveBlock(block) {
        this.updateLastBlock(block);
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            this.worker.send({
                type: 'add',
                block
            });
            yield this.onBlockAddedToChain();
            this.updateReaders();
            resolve(true);
        }));
    }
    saveWorkerMessageHandler(msg) {
        switch (msg.type) {
            case 'saved':
                this.emitter.emit('block_added_to_chain');
                break;
        }
    }
    onBlockAddedToChain() {
        return new Promise((resolve) => {
            const handler = () => {
                this.emitter.removeListener('block_added_to_chain', handler);
                resolve(true);
            };
            this.emitter.on('block_added_to_chain', handler);
        });
    }
    getTransactionIndex(tid) {
        const key = Buffer.concat([
            Buffer.from(constant_1.default.TRANSACTION_PREFIX),
            tid
        ]);
        return this.blockchainDB.get(this.blockchainReader, key);
    }
    getUnspentTransactionsForAddress(address) {
        return this.getUnspentOutputsByAddress(address);
    }
    getBalanceForAddress(address) {
        const utxo = this.getUnspentOutputsByAddress(address);
        return helpers_1.default.sumArrayObjects(utxo, 'amount');
    }
    addBlockToChain(newBlock, emit = true) {
        this.blockQueue[newBlock.hash] = newBlock;
        this.queue.add({ hash: newBlock.hash, emit });
    }
    blockSaveHandler() {
        this.queue.process((job, done) => __awaiter(this, void 0, void 0, function* () {
            const newBlock = this.blockQueue[job.data.hash];
            delete this.blockQueue[job.data.hash];
            try {
                if (!newBlock.compressed) {
                    yield this.saveBlock(newBlock);
                    logger_1.default.info(`Block added: ${newBlock.hash}`);
                }
                else {
                    let compressedTxs;
                    const currentBlock = yield this.getLastBlock();
                    if (newBlock.compressed) {
                        compressedTxs = newBlock.compressed;
                        delete newBlock.compressed;
                    }
                    Blockchain.isValidBlock(newBlock, currentBlock);
                    Blockchain.isValidBlockTxs(newBlock.data);
                    if (!compressedTxs) {
                        compressedTxs = yield helpers_1.default.compressData(newBlock.data, 'base64');
                    }
                    newBlock.data = compressedTxs;
                    yield this.saveBlock(newBlock);
                    logger_1.default.info(`Block added: ${newBlock.hash}`);
                    if (process.env.NODE_ENV === 'dev') {
                        logger_1.default.info(`Block info: ${JSON.stringify(block_1.default.createBlockHeader(newBlock))}`);
                    }
                }
                this.emitter.emit('update_last_block');
                this.emitter.emit('new_last_index', newBlock.index);
            }
            catch (error) {
                const message = `Failed to add block: ${error}`;
                logger_1.default.error(message);
                throw new Error(message);
            }
            done();
        }));
    }
    updateChain(blocks, synchronized = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            let length = blocks.length;
            while (length--) {
                let block = blocks[length];
                if (synchronized) {
                    const compressedTxs = block.data;
                    const buf = Buffer.from(compressedTxs, 'base64');
                    block.data = yield helpers_1.default.decompressData(buf, 'array');
                    block = block_1.default.fromJS(block);
                    block.compressed = compressedTxs;
                }
                this.addBlockToChain(block, false);
            }
        });
    }
}
exports.default = Blockchain;
//# sourceMappingURL=index.js.map