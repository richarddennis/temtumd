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
const STAN = require("node-nats-streaming");
const config_1 = require("../config");
const helpers_1 = require("../util/helpers");
const logger_1 = require("../util/logger");
class Node {
    constructor(emitter, blockchain, queue) {
        this.ready = 0;
        this.emitter = emitter;
        this.blockchain = blockchain;
        this.queue = queue;
    }
    initEventHandlers() {
        this.queue.on('drained', () => __awaiter(this, void 0, void 0, function* () {
            if (!this.ready) {
                yield this.sync();
            }
        }));
        this.emitter.on('node_ready', () => {
            this.updateNodeState();
        });
    }
    setReadyStatus(status) {
        if (this.ready === status) {
            return;
        }
        this.ready = status;
        this.emitter.emit('node_ready', this.ready);
    }
    connectToBlockServer(servers) {
        return new Promise((resolve, reject) => {
            const autoReconnectInterval = 60000;
            const clientID = process.env.HOST.replace(/\./g, '-');
            if (this.natsBlock) {
                this.natsBlock.removeAllListeners();
            }
            this.natsBlock = STAN.connect(config_1.default.NATS_CLUSTER_ID, clientID, {
                servers,
                token: process.env.NATS_TOKEN
            });
            this.natsBlock.on('connect', (client) => {
                logger_1.default.info(`Connected to STAN. Client id: ${client.clientID}`);
                resolve(true);
            });
            this.natsBlock.on('error', (error) => {
                logger_1.default.error(error);
                this.setReadyStatus(0);
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.connectToBlockServer(servers);
                }), autoReconnectInterval);
                reject(error);
            });
            this.natsBlock.on('close', () => __awaiter(this, void 0, void 0, function* () {
                logger_1.default.info('Connection to STAN is closed.');
                this.setReadyStatus(0);
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.connectToBlockServer(servers);
                }), autoReconnectInterval);
            }));
        });
    }
    connectToMessageService(servers) {
        return __awaiter(this, void 0, void 0, function* () {
            servers = servers.split(',').map((item) => {
                return item.trim();
            });
            try {
                yield this.connectToBlockServer(servers);
            }
            catch (error) { }
        });
    }
    updateNodeState() {
        if (this.isNodeReady()) {
            this.initBlockSubscription();
        }
        else if (this.blockSubscription) {
            this.blockSubscription.unsubscribe();
            this.blockSubscription = null;
        }
    }
    initBlockSubscription() {
        if (this.blockSubscription) {
            return;
        }
        this.blockSubscription = this.natsBlock.subscribe('BLOCK_ADDED');
        this.blockSubscription.on('message', (data) => __awaiter(this, void 0, void 0, function* () {
            const msg = helpers_1.default.JSONToObject(data.getData());
            try {
                yield this.handleReceivedChain(msg.data);
            }
            catch (error) {
                logger_1.default.error(error);
            }
        }));
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connectToMessageService(process.env.NATS_SERVERS);
        });
    }
    sync() {
        return __awaiter(this, void 0, void 0, function* () {
            const lastBlockResponse = yield axios_1.default.get(`${process.env.SYNC_ADDRESS}/block/last`);
            const lastPeerBlock = lastBlockResponse.data;
            if (lastPeerBlock) {
                let currentBlock = yield this.blockchain.getLastBlock();
                if (!currentBlock || lastPeerBlock.index > currentBlock.index) {
                    yield this.requestBlocks(currentBlock ? currentBlock.index : -1);
                    return;
                }
                if (lastPeerBlock.index === currentBlock.index &&
                    lastPeerBlock.hash !== currentBlock.hash) {
                    yield this.blockchain.deleteBlockByIndex(currentBlock.index);
                    const newCurrentBlock = yield this.blockchain.getLastBlock();
                    yield this.requestBlocks(newCurrentBlock.index);
                    return;
                }
                if (lastPeerBlock.index < currentBlock.index) {
                    const blockToCheck = yield this.blockchain.getBlockByIndex(lastPeerBlock.index);
                    if (!blockToCheck || lastPeerBlock.hash !== blockToCheck.hash) {
                        while (currentBlock.index >= lastPeerBlock.index) {
                            yield this.blockchain.deleteBlockByIndex(currentBlock.index);
                            currentBlock = yield this.blockchain.getLastBlock();
                        }
                        yield this.requestBlocks(currentBlock.index);
                        return;
                    }
                }
                this.setReadyStatus(1);
            }
            return;
        });
    }
    requestBlocks(start) {
        return __awaiter(this, void 0, void 0, function* () {
            const syncResponse = yield axios_1.default.post(`${process.env.SYNC_ADDRESS}/sync`, {
                start
            });
            yield this.handleBlocks(syncResponse.data.blocks);
        });
    }
    run() {
        this.init().then(() => __awaiter(this, void 0, void 0, function* () {
            this.initEventHandlers();
            yield this.initConnection();
        }));
    }
    initConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sync();
        });
    }
    isNodeReady() {
        return this.ready;
    }
    handleBlocks(receivedBlocks) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!receivedBlocks.length) {
                return true;
            }
            const currentBlock = yield this.blockchain.getLastBlock();
            const startChainBlock = receivedBlocks[receivedBlocks.length - 1];
            if (!currentBlock) {
                yield this.blockchain.updateChain(receivedBlocks);
                return true;
            }
            if (startChainBlock.index <= currentBlock.index) {
                logger_1.default.info('Received chain is not longer than current chain. Do nothing');
                return true;
            }
            if (currentBlock.index + 1 === startChainBlock.index) {
                if (currentBlock.hash === startChainBlock.previousHash) {
                    logger_1.default.info(`Blockchain possibly behind. We got: ${currentBlock.index}, Peer got: ${startChainBlock.index}`);
                    yield this.blockchain.updateChain(receivedBlocks, this.ready);
                    return true;
                }
                yield this.blockchain.deleteBlockByIndex(currentBlock.index);
            }
            return false;
        });
    }
    handleReceivedChain(receivedBlocks) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = yield this.handleBlocks(receivedBlocks);
                if (status) {
                    return;
                }
                this.setReadyStatus(0);
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.default = Node;
//# sourceMappingURL=index.js.map