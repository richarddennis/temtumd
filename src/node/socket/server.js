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
const http = require("http");
const https = require("https");
const WebSocket = require("ws");
const constant_1 = require("../../constant");
const helpers_1 = require("../../util/helpers");
const logger_1 = require("../../util/logger");
const timer_1 = require("../../util/timer");
const creator_1 = require("../message/creator");
const type_1 = require("../message/type");
const base_1 = require("./base");
class Server extends base_1.default {
    constructor(node, mempool, blockchain) {
        super(node, mempool, blockchain);
        this.peerBanTime = 300;
        this.config();
        this.createServer();
        this.sockets();
    }
    checkSynchronization(peer, client) {
        return new Promise((resolve) => {
            if (peer.explorer || peer.mining) {
                resolve(1);
            }
            this.sendMsg(client, creator_1.default.queryChainLengthMsg());
            client.on('message', (msg) => __awaiter(this, void 0, void 0, function* () {
                const message = helpers_1.default.JSONToObject(msg);
                if (message === null) {
                    logger_1.default.warn(`Could not parse received JSON message: ${msg}`);
                    return;
                }
                if (message.type === type_1.default.RESPONSE_LAST_BLOCK) {
                    const lastBlock = yield this.blockchain.getLastBlock();
                    const diff = Math.abs(lastBlock.index - message.payload.block.index);
                    if (diff >= 5) {
                        resolve(0);
                    }
                    resolve(1);
                }
            }));
        });
    }
    listen() {
        return new Promise((resolve) => {
            this.socket.on('connection', (client, req) => __awaiter(this, void 0, void 0, function* () {
                const remoteAddress = helpers_1.default.getRemoteAddress(req.connection.remoteAddress);
                const peer = this.node.getPeer(constant_1.default.PEER_PREFIX + remoteAddress);
                const peerSync = yield this.checkSynchronization(peer, client);
                if (!peerSync) {
                    const peerSyncAttempt = parseInt(yield this.node.getRedisData(peer.address));
                    if (!peerSyncAttempt) {
                        this.node.redisClient.set(peer.address, 1, 'EX', this.peerBanTime);
                    }
                    else {
                        this.node.redisClient.set(peer.address, peerSyncAttempt + 1, 'EX', this.peerBanTime);
                    }
                    client.close(1000, 'Peer is not synchronized');
                    return;
                }
                client.remoteAddress = remoteAddress;
                client.ready = 0;
                if (peer && peer.mining) {
                    this.node.nodeListBlocks[remoteAddress] = peer;
                }
                this.clientList.push(client);
                this.authorizeClient(client);
                this.sendMsg(client, creator_1.default.queryChainLengthMsg());
                if (this.hasMasterNode) {
                    this.node.setPeerStatus(client.remoteAddress);
                    client.randomBlockChecker = new timer_1.default(this.sendMsg.bind(this, client, creator_1.default.requestRandomBlock()), Number(process.env.BLOCK_CHECK_INTERVAL) * 1000);
                }
                client.on('message', (msg) => __awaiter(this, void 0, void 0, function* () {
                    const message = helpers_1.default.JSONToObject(msg);
                    if (message === null) {
                        logger_1.default.warn(`Could not parse received JSON message: ${msg}`);
                        return;
                    }
                    if (this.hasMasterNode) {
                        yield this.messageHandler(client, message);
                    }
                    yield this.commonMessageHandler(client, message);
                }));
                client.on('blockchain_sync_needed', (start) => {
                    this.sendMsg(client, creator_1.default.querySyncBlockchain(start));
                });
                client.on('close', () => {
                    logger_1.default.info(`Node '${client.remoteAddress}' connection closed.`);
                    this.removeClient(client);
                });
                client.on('error', (error) => {
                    logger_1.default.info(error);
                    this.removeClient(client);
                });
            }));
            this.server.listen(this.port, () => {
                logger_1.default.info(`Listening WebSocket P2P on port: ${this.port}`);
                if (this.hasMasterNode) {
                    this.setToken();
                    this.updateTokenByTime();
                }
                resolve(true);
            });
        });
    }
    sendMsg(client, data) {
        data.token = this.token;
        client.send(JSON.stringify(data));
    }
    broadcast(message, exclude = []) {
        this.clientList.forEach((client) => {
            if (exclude.indexOf(client.remoteAddress) === -1) {
                this.sendMsg(client, message);
            }
        });
    }
    startSync(remoteAddress) {
        const client = this.findClientByAddress(remoteAddress);
        if (client) {
            this.sendMsg(client, creator_1.default.queryChainLengthMsg());
        }
    }
    findClientByAddress(remoteAddress) {
        return this.clientList.find((client) => client.remoteAddress === remoteAddress);
    }
    messageHandler(client, message) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (message.type) {
                case type_1.default.QUERY_PEERS: {
                    const peerList = this.node.getPeerListForNodes();
                    const encrypted = helpers_1.default.encrypt(Buffer.from(JSON.stringify(peerList)), Buffer.from(this.token, 'hex'));
                    this.sendMsg(client, creator_1.default.responsePeers(encrypted));
                    return;
                }
                case type_1.default.REQUEST_PEER_READY: {
                    this.node.setPeerStatus(client.remoteAddress, 2);
                    client.ready = 1;
                    if (this.node.getSyncStatus()) {
                        this.sendPeerReady(client);
                    }
                    return;
                }
                case type_1.default.RESPONSE_RANDOM_BLOCK: {
                    const block = message.payload.block;
                    const currentBlock = this.blockchain.getBlockByHash(block.hash);
                    if (JSON.stringify(block) !== JSON.stringify(currentBlock)) {
                        logger_1.default.warn(`The node '${client.remoteAddress}' will be disconnected. Block check failed`);
                        this.node.dropPeer(client.remoteAddress);
                        client.close();
                        this.broadcast(creator_1.default.requestPeerDelete(client.remoteAddress));
                    }
                    return;
                }
                case type_1.default.RESPONSE_LAST_BLOCK: {
                    const block = message.payload.block;
                    if (block) {
                        // if (Base.checkSyncAttempt(client, block.index)) {
                        const lastBlockIndex = yield this.blockchain.getLastBlockIndex();
                        if (this.node.nodeListBlocks[client.remoteAddress]) {
                            this.node.nodeListBlocks[client.remoteAddress].block = block;
                        }
                        if (block.index > lastBlockIndex) {
                            this.sendMsg(client, creator_1.default.querySyncBlockchain(lastBlockIndex));
                            return;
                        }
                        this.node.setSyncStatus(1);
                        if (client.ready) {
                            this.sendPeerReady(client);
                        }
                        // }
                    }
                    return;
                }
                case type_1.default.RESPONSE_LAST_BLOCK_HEADER: {
                    const block = message.payload.block;
                    if (this.node.nodeListBlocks[client.remoteAddress]) {
                        this.node.nodeListBlocks[client.remoteAddress].block = block;
                    }
                    return;
                }
            }
        });
    }
    detectServer() {
        if (process.env.USE_WEBSOCKETS_SSL === 'true') {
            return https.createServer({
                key: fs.readFileSync(`${this.rootDir}/ssl/certs/server-key.pem`),
                cert: fs.readFileSync(`${this.rootDir}/ssl/certs/server-crt.pem`),
                ca: fs.readFileSync(`${this.rootDir}/ssl/certs/ca-crt.pem`),
                requestCert: true,
                rejectUnauthorized: true
            });
        }
        return http.createServer();
    }
    countMiners(peerList) {
        let miners = 0;
        peerList.forEach((peer) => {
            if (peer.mining) {
                miners++;
            }
        });
        return miners;
    }
    sendPeerReady(client) {
        const peerList = this.node.getPeerListForNodes();
        logger_1.default.info(`Client ${client.remoteAddress} synchronized.`);
        if (this.countMiners(peerList) === 1) {
            this.changeLeader();
        }
        const nodeLeader = this.node.getLeader();
        this.sendMsg(client, creator_1.default.responsePeerReady(peerList, nodeLeader));
        this.broadcast(creator_1.default.updatePeerList(peerList), [
            client.remoteAddress
        ]);
    }
    changeLeader() {
        this.node.changeLeader(this.token);
    }
    updateToken() {
        this.setToken();
        this.changeLeader();
        const nodeLeader = this.node.getLeader();
        this.broadcast(creator_1.default.updateClientToken(nodeLeader));
    }
    updateTokenByTime() {
        setInterval(() => {
            this.updateToken();
        }, Number(process.env.UPDATE_TOKEN_INTERVAL || 60) * 1000);
    }
    authorizeClient(client) {
        if (this.hasMasterNode) {
            this.sendMsg(client, creator_1.default.authorizeClient());
        }
    }
    removeClient(client) {
        client.removeAllListeners();
        this.clientList = this.clientList.filter((item) => {
            return item.remoteAddress !== client.remoteAddress;
        });
        if (this.hasMasterNode) {
            client.randomBlockChecker.stop();
            this.node.setPeerStatus(client.remoteAddress, 0);
            const peerList = this.node.getPeerListForNodes();
            this.broadcast(creator_1.default.updatePeerList(peerList));
        }
    }
    createServer() {
        this.server = this.detectServer();
    }
    config() {
        this.port = process.env.P2P_PORT || 6001;
        this.hasMasterNode = process.env.MASTER === 'true';
    }
    sockets() {
        this.socket = new WebSocket.Server({
            server: this.server,
            verifyClient: this.verifyClient.bind(this)
        });
    }
    /**
     * @param info
     * @param cb
     */
    verifyClient(info, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = helpers_1.default.getRemoteAddress(info.req.connection.remoteAddress);
            if (this.hasMasterNode) {
                const secret = info.req.headers.secret;
                if (yield this.node.hasAllowedNode(address, secret)) {
                    cb(true);
                }
                else {
                    cb(false, 401, 'Unauthorized');
                }
            }
            else {
                const token = info.req.headers.token;
                if (token &&
                    this.token === token &&
                    this.node.findNotBannedPeer(address)) {
                    cb(true);
                }
                else {
                    cb(false, 401, 'Unauthorized');
                }
            }
        });
    }
}
exports.default = Server;
//# sourceMappingURL=server.js.map