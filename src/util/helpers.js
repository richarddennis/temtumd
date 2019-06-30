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
const crypto = require("crypto");
const mkdirp = require("mkdirp");
const zstd = require("zstd-lib");
const logger_1 = require("./logger");
class Helpers {
    static writeVarInt(val) {
        let buf;
        if (val <= 240) {
            buf = Buffer.alloc(1);
            buf[0] = val;
            return buf;
        }
        if (val <= 2287) {
            buf = Buffer.alloc(2);
            buf[0] = (val - 240) / 256 + 241;
            buf[1] = val - 240;
            return buf;
        }
        if (val <= 67823) {
            buf = Buffer.alloc(3);
            buf[0] = 249;
            buf[1] = (val - 2288) / 256;
            buf[2] = val - 2288;
            return buf;
        }
        if (val <= 16777215) {
            buf = Buffer.alloc(4);
            buf[0] = 250;
            buf.writeUIntBE(val, 1, 3);
            return buf;
        }
        if (val <= 4294967295) {
            buf = Buffer.alloc(5);
            buf[0] = 251;
            buf.writeUIntBE(val, 1, 4);
            return buf;
        }
        if (val <= 1099511627775) {
            buf = Buffer.alloc(6);
            buf[0] = 252;
            buf.writeUIntBE(val, 1, 5);
            return buf;
        }
        if (val <= 281474976710655) {
            buf = Buffer.alloc(7);
            buf[0] = 253;
            buf.writeUIntBE(val, 1, 6);
            return buf;
        }
        if (val <= 72057594037927935) {
            buf = Buffer.alloc(8);
            buf[0] = 254;
            buf.writeUIntBE(val, 1, 7);
            return buf;
        }
        buf = Buffer.alloc(9);
        buf[0] = 255;
        buf.writeUIntBE(val, 1, 8);
        return buf;
    }
    static readVarInt(buf, pos = 0) {
        let len;
        let res = buf.readUInt8(pos);
        pos += 1;
        if (res <= 240) {
            return { value: res, position: pos };
        }
        if (res <= 248) {
            res = 240 + 256 * (res - 241) + buf.readUInt8(pos);
            return { value: res, position: pos };
        }
        if (res === 249) {
            res = 2288 + 256 * buf.readUInt8(pos) + buf.readUInt8(pos + 1);
            return { value: res, position: pos };
        }
        len = 3 + res - 250;
        res = buf.readUIntBE(pos, len);
        return { value: res, position: pos };
    }
    static toAscendingKey(key) {
        const len = key.toString().length;
        const maxLen = Number.MAX_SAFE_INTEGER.toString().length;
        return '0'.repeat(maxLen - len) + key;
    }
    static getRandToken(byte = 16) {
        return crypto.randomBytes(byte).toString('hex');
    }
    static objectToArray(obj = {}) {
        const keys = Object.keys(obj);
        return keys.length ? keys.map((key) => obj[key]) : [];
    }
    static sumArrayObjects(arr = [], key) {
        return arr.reduce((a, b) => a + b[key], 0);
    }
    static toShortAddress(address) {
        let result = '';
        // 14 is the length of 0x20000000000000 (2^53 in base 16)
        for (let i = 0, max = 14; i < address.length; i += max) {
            const chunk = address.substr(i, max);
            let intChunk = parseInt(chunk, 16);
            if (intChunk.toString(16) !== chunk) {
                intChunk = parseInt(address.substr(i, max - 1), 16);
                i -= 1;
            }
            result += intChunk.toString(36);
        }
        return result;
    }
    static fromShortAddress(address) {
        let result = '';
        // 11 is the length of 2gosa7pa2gv (2^53 in base 36)
        for (let i = 0, max = 11; i < address.length; i += max) {
            const chunk = address.substr(i, max);
            let intChunk = parseInt(chunk, 36);
            if (intChunk.toString(36) !== chunk) {
                intChunk = parseInt(address.substr(i, max - 1), 36);
                i -= 1;
            }
            result += intChunk.toString(16);
        }
        return result;
    }
    static getRemoteAddress(str) {
        return /wss/.test(str)
            ? str.replace(/^.*\/\/|:.*$/gm, '')
            : str.replace(/^.*:/, '');
    }
    static toHexString(byteArray) {
        return Array.from(byteArray, (byte) => {
            return ('0' + (byte & 0xff).toString(16)).slice(-2);
        }).join('');
    }
    static JSONToObject(data, log = true) {
        try {
            return data ? JSON.parse(data) : {};
        }
        catch (e) {
            if (log) {
                logger_1.default.error(e);
            }
            return null;
        }
    }
    static getCurrentTimestamp() {
        return Math.round(new Date().getTime() / 1000);
    }
    static strToBoolean(str, defaultValue = false) {
        if (!str) {
            return defaultValue;
        }
        switch (str.toLowerCase()) {
            case 'true':
            case '1':
            case 'on':
            case 'yes':
            case 'y':
                return true;
            case 'false':
            case '0':
            case 'off':
            case 'no':
            case 'n':
                return false;
        }
        return defaultValue;
    }
    static asyncForEach(array, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let index = 0; index < array.length; index++) {
                yield callback(array[index], index, array);
            }
        });
    }
    static setImmediatePromise() {
        return new Promise((resolve) => {
            setImmediate(() => resolve());
        });
    }
    static compressData(data, resultType = 'buffer') {
        const input = Buffer.from(JSON.stringify(data));
        return new Promise((resolve, reject) => {
            zstd.compress(input, { level: 5 }, (error, result) => {
                if (error) {
                    return reject(error);
                }
                if (resultType === 'base64') {
                    return resolve(result.toString('base64'));
                }
                return resolve(result);
            });
        });
    }
    static decompressData(data, resultType = 'buffer') {
        return new Promise((resolve, reject) => {
            zstd.decompress(data, { level: 5 }, (error, result) => __awaiter(this, void 0, void 0, function* () {
                if (error) {
                    return reject(error);
                }
                if (resultType === 'array') {
                    const output = Helpers.JSONToObject(result.toString());
                    return resolve(output);
                }
                return resolve(result);
            }));
        });
    }
    static createFolder(path) {
        return mkdirp.sync(path);
    }
    static encrypt(data, key) {
        const algorithm = 'aes-256-ctr';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }
    static decrypt(data, key) {
        const parts = data.split(':');
        const algorithm = 'aes-256-ctr';
        const iv = Buffer.from(parts.shift(), 'hex');
        const encrypted = Buffer.from(parts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        return decrypted.toString();
    }
    static isEmptyObject(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }
}
exports.default = Helpers;
//# sourceMappingURL=helpers.js.map