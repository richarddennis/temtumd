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
const EventEmitter = require("events");
const helpers_1 = require("../../util/helpers");
const logger_1 = require("../../util/logger");
const creator_1 = require("../message/creator");
const type_1 = require("../message/type");
class Base extends EventEmitter {
    constructor(node, mempool, blockchain) {
        super();
        this.previousRequests = {};
        this.clientList = [];
        this.node = node;
        this.mempool = mempool;
        this.blockchain = blockchain;
        this.rootDir = process.cwd();
    }
    static errorHandler(remoteAddress, error) {
        switch (error.code) {
            case 'ETIMEDOUT':
                logger_1.default.error(`Connection the peer '${remoteAddress}' failed.`);
                break;
            case 'ECONNRESET':
                logger_1.default.error(`The peer '${remoteAddress}' dropped the connection.`);
                break;
            case 'EPROTO':
                logger_1.default.error('Wrong certificate.');
                break;
            case undefined:
                if (/401/.test(error.message)) {
                    logger_1.default.error(`Could not log in to peer '${remoteAddress}'.`);
                }
                else {
                    logger_1.default.error(error.message);
                }
                break;
            default:
                logger_1.default.error(`Could not connect to peer '${remoteAddress}'.`);
        }
    }
    static checkSyncAttempt(client, blockIndex) {
        if (client.syncAttempts) {
            if (client.syncAttempts.blockIndex === blockIndex) {
                client.syncAttempts.attempt++;
            }
            else {
                client.syncAttempts.blockIndex = blockIndex;
                client.syncAttempts.attempt = 1;
            }
            if (client.syncAttempts.attempt > 5) {
                client.close();
                return false;
            }
        }
        else {
            client.syncAttempts = {
                blockIndex,
                attempt: 1
            };
        }
        return true;
    }
    sendMsg(client, data, remoteAddress = '') {
        if (remoteAddress) {
            this.previousRequests[client.remoteAddress] = Object.assign({}, data);
        }
        data.token = this.token;
        try {
            client.send(JSON.stringify(data));
        }
        catch (error) {
            logger_1.default.error(error);
        }
    }
    broadcast(message, exclude = []) {
        this.clientList.forEach((client) => {
            if (exclude.indexOf(client.remoteAddress) === -1) {
                this.sendMsg(client, message);
            }
        });
    }
    setToken() {
        this.token = helpers_1.default.getRandToken(32);
    }
    repeatPreviousQuery(client) {
        if (this.previousRequests.hasOwnProperty(client.remoteAddress)) {
            const message = this.previousRequests[client.remoteAddress];
            this.sendMsg(client, message);
        }
    }
    commonMessageHandler(client, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.default.info(`Received message type: ${message.type}`);
                switch (message.type) {
                    case type_1.default.WRONG_TOKEN: {
                        this.repeatPreviousQuery(client);
                        return;
                    }
                    case type_1.default.QUERY_LAST_BLOCK: {
                        const lastBlock = yield this.blockchain.getLastBlock();
                        this.sendMsg(client, creator_1.default.responseLatestMsg(lastBlock));
                        return;
                    }
                    case type_1.default.QUERY_SYNC_BLOCKCHAIN: {
                        const start = message.payload.start;
                        // if (Base.checkSyncAttempt(client, start)) {
                        const blocks = yield this.blockchain.syncBlocks(start);
                        try {
                            this.sendMsg(client, creator_1.default.responseSyncBlockchain(blocks));
                        }
                        catch (error) {
                            logger_1.default.error(error);
                        }
                        // }
                        return;
                    }
                    case type_1.default.RESPONSE_SYNC_BLOCKCHAIN: {
                        const blocks = message.payload.blocks;
                        yield this.node.handleReceivedChain(blocks);
                        this.sendMsg(client, creator_1.default.queryChainLengthMsg());
                        return;
                    }
                    case type_1.default.QUERY_TRANSACTION_POOL:
                        const txPool = this.mempool.getTransactions();
                        this.sendMsg(client, creator_1.default.responseTransactionPoolMsg(txPool));
                        break;
                    case type_1.default.RESPONSE_TRANSACTION_POOL: {
                        const receivedTxs = message.payload.txPool;
                        if (!Array.isArray(receivedTxs)) {
                            logger_1.default.warn(`Invalid transaction(s) received: ${JSON.stringify(message)}`);
                            break;
                        }
                        yield this.node.handleReceivedTxs(receivedTxs);
                        return;
                    }
                }
            }
            catch (error) {
                logger_1.default.error(error);
            }
        });
    }
}
exports.default = Base;
//# sourceMappingURL=base.js.map