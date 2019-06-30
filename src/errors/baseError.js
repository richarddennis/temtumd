"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseError extends Error {
    constructor(message, status, options) {
        super();
        this.message = message || 'Something went wrong. Please try again';
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.status = status || 500;
        this.options = options;
    }
}
exports.default = BaseError;
//# sourceMappingURL=baseError.js.map