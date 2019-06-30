"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const customErrors_1 = require("../../errors/customErrors");
exports.default = {
    sendTransaction: (req, res, next) => {
        if (!req.body.txHex ||
            typeof req.body.txHex !== 'string' ||
            !RegExp(/[0-9A-Fa-f]{6}/).test(req.body.txHex)) {
            next(new customErrors_1.default.BadRequest('Invalid transaction hex'));
        }
        next();
    },
    createTransaction: (req, res, next) => {
        if (!req.body.from ||
            typeof req.body.from !== 'string' ||
            req.body.from.length !== 66) {
            next(new customErrors_1.default.BadRequest('Invalid sender address'));
        }
        if (!req.body.to ||
            typeof req.body.to !== 'string' ||
            req.body.to.length !== 66) {
            next(new customErrors_1.default.BadRequest('Invalid recipient address'));
        }
        if (!req.body.privateKey ||
            typeof req.body.privateKey !== 'string' ||
            req.body.privateKey.length !== 64) {
            next(new customErrors_1.default.BadRequest('Invalid private key'));
        }
        if (!req.body.amount ||
            typeof req.body.amount !== 'number' ||
            req.body.amount < 1) {
            next(new customErrors_1.default.BadRequest('Invalid amount'));
        }
        next();
    }
};
//# sourceMappingURL=index.js.map