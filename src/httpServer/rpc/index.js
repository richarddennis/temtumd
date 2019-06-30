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
const logger_1 = require("../../util/logger");
const error_codes_1 = require("./error-codes");
const helpers_1 = require("./helpers");
const VERSION = '2.0';
const config = {
    methods: {},
    beforeMethods: {},
    onError: null
};
/**
 * Validate and merge custom config with default
 * @param userConfig
 */
function setConfig(userConfig) {
    if ('methods' in userConfig &&
        (typeof userConfig.methods !== 'object' ||
            Array.isArray(userConfig.methods))) {
        helpers_1.throwRpcErr('JSON-RPC error: methods should be an object');
    }
    if ('beforeMethods' in userConfig &&
        (typeof userConfig.beforeMethods !== 'object' ||
            Array.isArray(userConfig.beforeMethods))) {
        helpers_1.throwRpcErr('JSON-RPC error: beforeMethods should be an object');
    }
    if ('onError' in userConfig && typeof userConfig.onError !== 'function') {
        helpers_1.throwRpcErr('JSON-RPC error: onError should be a function');
    }
    Object.assign(config, userConfig);
}
/**
 * JSON RPC request handler
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @return {Promise}
 */
function handleSingleReq(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id, method, jsonrpc } = req.body;
        try {
            helpers_1.validateJsonRpcVersion(jsonrpc, VERSION);
            helpers_1.validateJsonRpcMethod(method, config.methods);
            if (helpers_1.isFunction(config.beforeMethods[method])) {
                try {
                    yield config.beforeMethods[method](req, res, next);
                }
                catch (err) {
                    err.code = error_codes_1.INVALID_REQUEST.code;
                    throw err;
                }
            }
            const result = yield config.methods[method](req, res, next);
            if (!helpers_1.isNil(id)) {
                return { jsonrpc, result, id };
            }
        }
        catch (err) {
            logger_1.default.error(err);
            if (helpers_1.isFunction(config.onError)) {
                config.onError(err, req, res, next);
            }
            return {
                jsonrpc: VERSION,
                error: {
                    code: err.code || error_codes_1.INTERNAL_ERROR.code,
                    message: err.code ? err.message : error_codes_1.INTERNAL_ERROR.message
                },
                id: id >= 0 ? id : null
            };
        }
    });
}
/**
 * Batch rpc request handler
 * @param {array} batchRpcData
 * @return {Promise}
 */
function handleBatchReq(batchRpcData) {
    return Promise.all(batchRpcData.reduce((memo, rpcData) => {
        const result = handleSingleReq(rpcData.req, rpcData.res, rpcData.next);
        if (!helpers_1.isNil(rpcData.id)) {
            memo.push(result);
        }
        return memo;
    }, []));
}
/**
 *
 * @param {object} userConfig Custom user router configuration
 * @return {function} middleware
 */
exports.default = (userConfig) => {
    setConfig(userConfig);
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (Array.isArray(req.body)) {
            res.send(yield handleBatchReq(req.body));
        }
        else if (typeof req.body === 'object') {
            res.send(yield handleSingleReq(req, res, next));
        }
        else {
            next(new Error('JSON-RPC router error: req.body is required. Ensure that you install body-parser and apply it before json-router.'));
        }
    });
};
//# sourceMappingURL=index.js.map