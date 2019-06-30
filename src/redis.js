"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const config_1 = require("./config");
class Redis {
    constructor() {
        this.commands = [];
        this.client = redis.createClient({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT
        });
    }
    pushCommand(command) {
        this.commands.push(command);
    }
    pushTransactionCommand(tx) {
        this.pushCommand(['lpush', config_1.default.REDIS_TX_CACHE, JSON.stringify(tx)]);
    }
    pushTransactionTrimCommand() {
        this.pushCommand(['ltrim', config_1.default.REDIS_TX_CACHE, '0', config_1.default.TX_PER_PAGE]);
    }
    pushBlockCommand(block) {
        this.pushCommand(['lpush', config_1.default.REDIS_BLOCK_CACHE, block]);
    }
    pushBlockTrimCommand() {
        this.pushCommand([
            'ltrim',
            config_1.default.REDIS_BLOCK_CACHE,
            '0',
            config_1.default.BLOCKS_PER_PAGE
        ]);
    }
    executeCommands() {
        return new Promise((resolve) => {
            this.client.multi(this.commands).exec(() => {
                this.commands = [];
                resolve();
            });
        });
    }
    getTransactionCache() {
        return new Promise((resolve, reject) => {
            this.client.lrange(config_1.default.REDIS_TX_CACHE, 0, -1, (err, res) => {
                if (err) {
                    reject(err);
                }
                res = res.map((tx) => {
                    return JSON.parse(tx);
                });
                resolve(res);
            });
        });
    }
    getBlockCache() {
        return new Promise((resolve, reject) => {
            this.client.lrange(config_1.default.REDIS_BLOCK_CACHE, 0, -1, (err, res) => {
                if (err) {
                    reject(err);
                }
                res = res.map((block) => {
                    return JSON.parse(block);
                });
                resolve(res);
            });
        });
    }
}
exports.default = Redis;
//# sourceMappingURL=redis.js.map