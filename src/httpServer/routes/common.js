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
const helpers_1 = require("../helpers");
const commonRoutes = {
    init: (app, commonEntity) => {
        /**
         * @api {post} /search Search block in blocks
         * @apiName search
         * @apiGroup Block
         *
         * @apiParam (Query string) {String=^[1-9]\d*$|String=([a-zA-Z0-9]{64})} string Block unique ID or hash.
         *
         * @apiSuccess {Object} block Requested block.
         * @apiSuccessExample Example block on success
         * {
         *  "index": 7024,
         *  "hash": "60794e8acd55203faebe05f468394cf5fbae7e7ca166a9590016aee8b83283d0",
         *  "previousHash": "3fe85c89baa8c77621cd19ae1298fe75b69686ebbffd1d53e4af23a2388673b6",
         *  "timestamp": 1530941569,
         *  "data": [{
         *    "type": "regular",
         *    "txIns": [{
         *      "txOutIndex": 7024
         *     }],
         *    "txOuts": [{
         *      "amount": 0,
         *      "address": ""
         *    }],
         *    "timestamp": 1530941569,
         *    "id": "8c5db06e8ea6090a4b8c4c053b667d5d5897b72b44cb515c7ccb359fc33d0a38"
         *  }]
         * }
         *
         * @apiErrorExample Error-Response:
         *    HTTP/1.1 200 OK
         *      "Not Found"
         */
        app.post(helpers_1.default.createV1Route('/search'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const query = req.body.query;
            const result = yield commonEntity.search(query);
            return res.send(result);
        }));
        app.get(helpers_1.default.createV1Route('/statistic'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield commonEntity.statistic();
            res.send(result);
        }));
    }
};
exports.default = commonRoutes;
//# sourceMappingURL=common.js.map