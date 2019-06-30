"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseError = {
    code: -32700,
    message: 'Parse error'
};
exports.PARSE_ERROR = parseError;
const invalidRequest = {
    code: -32600,
    message: 'Invalid Request'
};
exports.INVALID_REQUEST = invalidRequest;
const methodNotFound = {
    code: -32601,
    message: 'Method not found'
};
exports.METHOD_NOT_FOUND = methodNotFound;
const invalidParams = {
    code: -32602,
    message: 'Invalid params'
};
exports.INVALID_PARAMS = invalidParams;
const internalError = {
    code: -32603,
    message: 'Internal error'
};
exports.INTERNAL_ERROR = internalError;
const serverError = {
    code: -32000,
    message: 'Server error'
};
exports.SERVER_ERROR = serverError;
//# sourceMappingURL=error-codes.js.map