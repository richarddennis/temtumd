"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const baseError_1 = require("../baseError");
class NotFound extends baseError_1.default {
    constructor(message, options = {}) {
        super(message, 404, options);
    }
}
exports.default = NotFound;
//# sourceMappingURL=notFound.js.map