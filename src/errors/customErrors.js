"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const badRequest_1 = require("./customErrors/badRequest");
const notFound_1 = require("./customErrors/notFound");
const serverError_1 = require("./customErrors/serverError");
const errors = {
    BadRequest: badRequest_1.default,
    NotFound: notFound_1.default,
    ServerError: serverError_1.default
};
exports.default = errors;
//# sourceMappingURL=customErrors.js.map