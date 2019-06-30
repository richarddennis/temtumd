"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const Queue = require("bull");
const events_1 = require("events");
const blockchain_1 = require("./blockchain");
const config_1 = require("./config");
const httpServer_1 = require("./httpServer");
const node_1 = require("./node");
const status_1 = require("./node/status");
const wallet_1 = require("./wallet");
dotenv.load();
const httpPort = parseInt(process.env.HTTP_PORT) || config_1.default.HTTP_PORT;
const queue = new Queue(config_1.default.REDIS_BLOCK_QUEUE, {
    redis: {
        port: parseInt(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST
    }
});
const emitter = new events_1.EventEmitter();
const blockchain = new blockchain_1.default(emitter, queue);
const wallet = new wallet_1.default(blockchain);
const node = new node_1.default(emitter, blockchain, queue);
const server = new httpServer_1.default(blockchain, wallet, node);
const nodeStatus = new status_1.default(emitter, blockchain);
server.listen(httpPort);
node.run();
//# sourceMappingURL=main.js.map