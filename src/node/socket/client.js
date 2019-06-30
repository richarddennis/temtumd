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
const fs = require("fs");
const WebSocket = require("ws");
const helpers_1 = require("../../util/helpers");
const logger_1 = require("../../util/logger");
const creator_1 = require("../message/creator");
const type_1 = require("../message/type");
const base_1 = require("./base");
class Client extends base_1.default {
    constructor(options, node, mempool, blockchain) {
        super(node, mempool, blockchain);
        this.autoReconnectInterval = 60000;
        this.config(options);
        this.open();
    }
    static detectConnectionType() {
        return process.env.USE_WEBSOCKETS_SSL === 'true' ? 'wss' : 'ws';
    }
    buildUrl() {
        const type = Client.detectConnectionType();
        this.url = `${type}://${this.remoteAddress}`;
        if (this.port) {
            this.url += `:${this.port}`;
        }
        if (this.path) {
            this.url += `/${this.path}`;
        }
    }
    populateConnectionOptions() {
        const options = {
            headers: this.hasServerMaster
                ? { secret: process.env.SECRET_TOKEN }
                : { token: this.token },
            perMessageDeflate: false
        };
        if (process.env.USE_WEBSOCKETS_SSL === 'true') {
            options.key = fs.readFileSync(`${this.rootDir}/ssl/certs/node-key.pem`);
            options.cert = fs.readFileSync(`${this.rootDir}/ssl/certs/node-crt.pem`);
            options.ca = fs.readFileSync(`${this.rootDir}/ssl/certs/ca-crt.pem`);
        }
        this.options = options;
    }
    config(options) {
        this.hasServerMaster = options.hasServerMaster;
        this.remoteAddress = options.address;
        this.port = options.port;
        this.buildUrl();
        this.populateConnectionOptions();
    }
    open() {
        this.client = new WebSocket(this.url, this.options);
        this.client.on('open', () => {
            logger_1.default.info(`Server connection ${this.remoteAddress} established.`);
        });
        this.client.on('message', (msg) => __awaiter(this, void 0, void 0, function* () {
            const message = helpers_1.default.JSONToObject(msg);
            if (message === null) {
                logger_1.default.warn(`Could not parse received JSON message: ${msg}`);
                return;
            }
            if (this.hasServerMaster) {
                yield this.messageHandler(message);
            }
            yield this.commonMessageHandler(this.client, message);
        }));
        this.client.on('close', () => {
            console.log('on close', this.remoteAddress);
            logger_1.default.info(`Connection to the peer '${this.remoteAddress}' closed.`);
            this.reconnect();
        });
        this.client.on('error', (error) => {
            console.log('on error', this.remoteAddress);
            Client.errorHandler(this.remoteAddress, error);
            // this.reconnect();
        });
    }
    reconnect() {
        if (this.hasServerMaster && this.node.mineBlockTimer) {
            this.node.mineBlockTimer.stop();
        }
        this.client.removeAllListeners();
        this.node.setSyncStatus(0);
        this.node.setReadyStatus(0);
        setTimeout(() => {
            this.open();
        }, this.autoReconnectInterval);
    }
    send(message) {
        this.sendMsg(this.client, message, this.remoteAddress);
    }
    startSync() {
        this.send(creator_1.default.queryChainLengthMsg());
    }
    getToken() {
        return this.token;
    }
    updateToken(token) {
        this.token = token;
    }
    messageHandler(message) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (message.type) {
                case type_1.default.AUTHORIZE_CLIENT: {
                    this.updateToken(message.token);
                    this.send(creator_1.default.queryPeers());
                    return;
                }
                case type_1.default.UPDATE_CLIENT_TOKEN: {
                    this.updateToken(message.token);
                    this.node.updateLeader(message.payload.leader);
                    this.node.onClientUpdateToken();
                    return;
                }
                case type_1.default.RESPONSE_PEER_READY: {
                    const receivedPeers = message.payload.peerList;
                    const nodeLeader = message.payload.leader;
                    this.node.updateLeader(nodeLeader);
                    this.node.updatePeers(receivedPeers);
                    this.node.setReadyStatus(1);
                    this.send(creator_1.default.queryTransactionPoolMsg());
                    return;
                }
                case type_1.default.RESPONSE_PEERS: {
                    const data = helpers_1.default.decrypt(message.payload.peerList, Buffer.from(this.token, 'hex'));
                    const receivedPeers = helpers_1.default.JSONToObject(data);
                    if (!Array.isArray(receivedPeers)) {
                        logger_1.default.warn(`Invalid peer(s) received: ${JSON.stringify(message)}`);
                        return;
                    }
                    this.node.updatePeers(receivedPeers);
                    this.send(creator_1.default.queryChainLengthMsg());
                    return;
                }
                case type_1.default.REQUEST_RANDOM_BLOCK: {
                    const block = this.blockchain.getRandomBlock();
                    this.send(creator_1.default.responseRandomBlock(block));
                    return;
                }
                case type_1.default.REQUEST_PEER_DELETE: {
                    this.node.dropPeer(message.payload.peer);
                    return;
                }
                case type_1.default.UPDATE_PEER_LIST: {
                    const receivedPeers = message.payload.peerList;
                    this.node.updatePeers(receivedPeers);
                    return;
                }
                case type_1.default.RESPONSE_LAST_BLOCK: {
                    const block = message.payload.block;
                    if (block) {
                        let currentBlock = yield this.blockchain.getLastBlock();
                        if (block.index > currentBlock.index) {
                            this.send(creator_1.default.querySyncBlockchain(currentBlock.index));
                            return;
                        }
                        if (block.index === currentBlock.index &&
                            block.hash !== currentBlock.hash) {
                            yield this.blockchain.deleteBlockByIndex(currentBlock.index);
                            const newCurrentBlock = yield this.blockchain.getLastBlock();
                            this.send(creator_1.default.querySyncBlockchain(newCurrentBlock.index));
                            return;
                        }
                        if (block.index < currentBlock.index) {
                            const blockToCheck = yield this.blockchain.getBlockByIndex(block.index);
                            if (!blockToCheck || block.hash !== blockToCheck.hash) {
                                while (currentBlock.index >= block.index) {
                                    yield this.blockchain.deleteBlockByIndex(currentBlock.index);
                                    currentBlock = yield this.blockchain.getLastBlock();
                                }
                                this.send(creator_1.default.querySyncBlockchain(currentBlock.index));
                                return;
                            }
                        }
                        if (!this.node.getSyncStatus()) {
                            this.node.setSyncStatus(1);
                            this.send(creator_1.default.requestPeerReady());
                        }
                    }
                    return;
                }
            }
        });
    }
}
exports.default = Client;
//# sourceMappingURL=client.js.map