"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const lmdb = require("lmdb-lib");
const path = require("path");
const helpers_1 = require("../util/helpers");
class DB {
    constructor(data, options = {}) {
        this.DB_ENV = new lmdb.Env();
        this.root = path.dirname(path.dirname(path.dirname(fs.realpathSync(__filename))));
        this.data = data;
        this.options = options;
        this.connect();
    }
    connect() {
        this.openEnv();
        this.openDbi();
    }
    openEnv() {
        const defaultOpt = {
            path: this.root + '/node/' + this.data,
            mapSize: 0x8000000000,
            maxReaders: 126
        };
        Object.assign(defaultOpt, this.options);
        helpers_1.default.createFolder(defaultOpt.path);
        this.DB_ENV.open(defaultOpt);
    }
    openDbi() {
        this.DBI = this.DB_ENV.openDbi({
            name: null,
            create: true
        });
    }
    initTxn(readOnly = true) {
        return this.DB_ENV.beginTxn({ readOnly });
    }
    batchWrite(data, options, callback) {
        this.DB_ENV.batchWrite(data, options, callback);
    }
    initWriteTxn() {
        this.WRITE_TXN = this.initTxn(false);
    }
    initReadTxn() {
        this.READ_TXN = this.initTxn();
    }
    setTxnIfNotExist(type) {
        if (type === 'write' && !this.WRITE_TXN) {
            this.initWriteTxn();
        }
        if (type === 'read' && !this.READ_TXN) {
            this.initReadTxn();
        }
    }
    initCursor(txn, keyIsBuffer = true) {
        return new lmdb.Cursor(txn, this.DBI, { keyIsBuffer });
    }
    getCursor(keyIsBuffer = true) {
        this.setTxnIfNotExist('read');
        return new lmdb.Cursor(this.READ_TXN, this.DBI, { keyIsBuffer });
    }
    get(txn, key) {
        return txn.getBinary(this.DBI, key);
    }
    getBinary(key) {
        this.setTxnIfNotExist('read');
        return this.READ_TXN.getBinary(this.DBI, key);
    }
    getBinaryUnsafe(key) {
        this.setTxnIfNotExist('read');
        return this.READ_TXN.getBinaryUnsafe(this.DBI, key);
    }
    getString(key) {
        this.setTxnIfNotExist('read');
        return this.READ_TXN.getString(this.DBI, key);
    }
    getStringUnsafe(key) {
        this.setTxnIfNotExist('read');
        return this.READ_TXN.getStringUnsafe(this.DBI, key);
    }
    put(txn, key, value = Buffer.from('')) {
        txn.putBinary(this.DBI, key, value);
    }
    putBinary(key, value = Buffer.from('')) {
        this.setTxnIfNotExist('write');
        this.WRITE_TXN.putBinary(this.DBI, key, value);
    }
    putString(key, value) {
        this.setTxnIfNotExist('write');
        this.WRITE_TXN.putString(this.DBI, key, value);
    }
    getMaxkeysize() {
        return this.DB_ENV.getMaxkeysize();
    }
    delete(key) {
        this.setTxnIfNotExist('write');
        this.WRITE_TXN.del(this.DBI, key);
    }
    del(txn, key) {
        txn.del(this.DBI, key);
    }
    commit() {
        if (this.WRITE_TXN) {
            this.WRITE_TXN.commit();
            this.WRITE_TXN = null;
            if (this.READ_TXN) {
                this.abort();
                this.READ_TXN = null;
            }
        }
    }
    sync() {
        return new Promise((resolve, reject) => {
            this.DB_ENV.sync((error) => {
                if (error) {
                    return reject(error);
                }
                return resolve(true);
            });
        });
    }
    abort() {
        if (this.READ_TXN) {
            this.READ_TXN.abort();
            this.READ_TXN = null;
        }
    }
    drop() {
        this.setTxnIfNotExist('write');
        this.DBI.drop({
            txn: this.WRITE_TXN,
            justFreePages: true
        });
    }
    close() {
        this.DBI.close();
        this.DB_ENV.close();
    }
}
exports.default = DB;
//# sourceMappingURL=db.js.map