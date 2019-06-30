"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const baseError_1 = require("../baseError");
class BadRequest extends baseError_1.default {
    constructor(message, options = {}) {
        super(message, 400, options);
    }
}
exports.default = BadRequest;
//# sourceMappingURL=badRequest.js.map