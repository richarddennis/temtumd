"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const helpers_1 = require("../util/helpers");
/**
 * @class
 */
class Block {
    static fromJS(json) {
        const { index, previousHash, data, beaconIndex, beaconValue, timestamp, hash } = json;
        return new Block(index, previousHash, data, beaconIndex, beaconValue, timestamp, hash);
    }
    static createBlockHeader(block) {
        const blockHeader = {};
        for (const key in block) {
            if (block.hasOwnProperty(key)) {
                if (key === 'data') {
                    blockHeader.txCount = block[key].length;
                    continue;
                }
                blockHeader[key] = block[key];
            }
        }
        return blockHeader;
    }
    constructor(index, previousHash, data, beaconIndex, beaconValue, timestamp, hash) {
        this.index = index;
        this.previousHash = previousHash;
        this.data = data;
        this.beaconIndex = beaconIndex;
        this.beaconValue = beaconValue;
        this.timestamp = timestamp ? timestamp : helpers_1.default.getCurrentTimestamp();
        this.hash = hash ? hash : this.calculateHash();
    }
    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(this.index +
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.beaconIndex +
            this.beaconValue)
            .digest('hex');
    }
}
exports.default = Block;
//# sourceMappingURL=block.js.map