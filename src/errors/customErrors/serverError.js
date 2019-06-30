"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const baseError_1 = require("../baseError");
class ServerError extends baseError_1.default {
    constructor(message, options = {}) {
        super(message, 500, options);
    }
}
exports.default = ServerError;
//# sourceMappingURL=serverError.js.map