"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_codes_1 = require("./error-codes");
/**
 * Just throw an error
 * @param {string} message
 * @param {number} code
 * @param {Object=} payload - additional error data
 */
const throwRpcErr = (message = 'JSON-RPC error', code = 500) => {
    const err = new Error(message);
    err.code = code;
    throw err;
};
exports.throwRpcErr = throwRpcErr;
/**
 * Validation for JSON-RPC version
 * @param {string} version
 * @param {string} requiredVersion
 */
const validateJsonRpcVersion = (version, requiredVersion) => {
    if (version !== requiredVersion) {
        this.throwRpcErr(`${error_codes_1.INVALID_REQUEST.message}, wrong version - ${version}`, error_codes_1.INVALID_REQUEST.code);
    }
};
exports.validateJsonRpcVersion = validateJsonRpcVersion;
/**
 * Validation for JSON-RPC method passed from browser
 * @param {string} method
 * @param {array} controller, list of existing methods
 */
const validateJsonRpcMethod = (method, controller) => {
    if (!method || typeof method !== 'string') {
        this.throwRpcErr(`${error_codes_1.INVALID_REQUEST.message}, wrong method - ${method}`, error_codes_1.INVALID_REQUEST.code);
    }
    else if (!(method in controller)) {
        this.throwRpcErr(`${error_codes_1.METHOD_NOT_FOUND.message} - ${method}`, error_codes_1.METHOD_NOT_FOUND.code);
    }
};
exports.validateJsonRpcMethod = validateJsonRpcMethod;
const isNil = (val) => val == null;
exports.isNil = isNil;
const isFunction = (fn) => typeof fn === 'function';
exports.isFunction = isFunction;
//# sourceMappingURL=helpers.js.map