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
const blockRoutes = {
    init: (app, blockEntity) => {
        /**
         * @api {get} /blocks/:page(\\d+)? Request block list on the given page
         * @apiName blocks
         * @apiGroup Block
         *
         * @apiParam {Number} page Page number of the block list.
         *
         * @apiSuccess {Object} object Array of requested blocks and page number.
         * @apiSuccessExample Example object on success
         * {
         *  blocks: Block[],
         *  pages: 2
         * }
         */
        app.get(helpers_1.default.createV1Route('/blocks'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield blockEntity.blocksList();
            res.send(result);
        }));
        app.get(helpers_1.default.createV1Route('/blocks/:page(\\d+)'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const page = req.params.page ? req.params.page - 1 : 0;
            const result = yield blockEntity.blocksList(page);
            res.send(result);
        }));
        /**
         * @api {get} /block/:hash([a-zA-Z0-9]{64}) Request block by its hash
         * @apiName blockByHash
         * @apiGroup Block
         *
         * @apiParam {String} hash Block hash.
         *
         * @apiSuccess {Object} object Requested block.
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
         */
        app.get(helpers_1.default.createV1Route('/block/:block'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { block } = req.params;
            const result = yield blockEntity.blockByHash(block);
            res.send(result);
        }));
        /**
         * @api {get} /block/last Request last block index
         * @apiName lastBlock
         * @apiGroup Dev
         * @apiPrivate
         *
         * @apiSuccess {String} string Last block index.
         * @apiSuccessExample Example block index on success
         * "1234"
         */
        app.get(helpers_1.default.createV1Route('/block/last'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield blockEntity.blockLast();
            res.send(result);
        }));
        app.get(helpers_1.default.createV1Route('/block/last/index'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield blockEntity.blockLastIndex();
            res.send(result);
        }));
    }
};
exports.default = blockRoutes;
//# sourceMappingURL=block.js.map