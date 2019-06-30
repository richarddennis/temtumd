"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Joi = require("joi");
exports.default = Joi.object().keys({
    id: Joi.strict(),
    timestamp: Joi.number(),
    type: Joi.string(),
    txIns: Joi.array(),
    txOuts: Joi.array()
});
//# sourceMappingURL=transaction.js.map