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
const index_1 = require("../validations/index");
const transactionRoutes = {
    init: (app, transactionEntity) => {
        /**
         * @api {post} /transaction/create Request creation of the transaction
         * @apiName transactionCreate
         * @apiGroup Transaction
         *
         * @apiParam (Request message body) {String} from Address of the sender(output wallet).
         * @apiParam (Request message body) {String} to Address of the receiver(input wallet).
         * @apiParam (Request message body) {Number=^[1-9]\d*$} amount Amount of coins(positive value).
         * @apiParam (Request message body) {String} privateKey Private key of the wallet.
         *
         * @apiSuccess {Object} object Transaction created.
         * @apiSuccessExample Example object on success
         * {
         *  transaction: {
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
         * }
         *
         * @apiErrorExample {json} Error-Response:
         *     HTTP/1.1 400 Bad Request
         *     {
         *       "message": "Invalid one of required params"
         *     }
         */
        app.post(helpers_1.default.createV1Route('/transaction/create'), index_1.default.createTransaction, (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { from, to, amount, privateKey } = req.body;
            const result = yield transactionEntity.transactionCreate(from, to, amount, privateKey);
            res.send(result);
        }));
        /**
         * @api {post} /transaction/send Send the created transaction to pool
         * @apiName transactionSend
         * @apiGroup Transaction
         *
         * @apiParam (Request message body) {String} transactionHex Transaction hex.
         *
         * @apiSuccess {Object} object Transaction created.
         * @apiSuccessExample Example object on success
         * {
         *  transaction: {
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
         * }
         *
         * @apiErrorExample {json} Error-Response:
         *     HTTP/1.1 400 Bad Request
         *     {
         *       "message": "Invalid hex"
         *     }
         */
        app.post(helpers_1.default.createV1Route('/transaction/send'), index_1.default.sendTransaction, (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { txHex } = req.body;
            const result = yield transactionEntity.transactionSend(txHex);
            return res.send(result, 201);
        }));
        /**
         * @api {get} /transaction/:id([a-zA-Z0-9]{64}) Request transaction by its ID
         * @apiName transactionById
         * @apiGroup Transaction
         *
         * @apiParam {String} id Transaction index.
         *
         * @apiSuccess {Object} object Requested transaction.
         * @apiSuccessExample Example object on success
         * {
         *  transaction: {
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
         * }
         */
        app.get(helpers_1.default.createV1Route('/transaction/:id([a-zA-Z0-9]{64})'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const result = yield transactionEntity.transactionId(id);
            return res.send(result);
        }));
        /**
         * @api {get} /transactions Request last transaction list
         * @apiName transactionLatest
         * @apiGroup Transaction
         *
         * @apiSuccess {Object} object Requested transactions.
         * @apiSuccessExample Example object on success
         * [
         *  {
         *    "type": "regular",
         *    "txIns": [{
         *      "txOutIndex": 7024
         *    }],
         *    "txOuts": [{
         *      "amount": 0,
         *      "address": ""
         *      ...
         *    }],
         *    "timestamp": 1530941569,
         *    "id": "8c5db06e8ea6090a4b8c4c053b667d5d5897b72b44cb515c7ccb359fc33d0a38"
         *  }
         * ]
         */
        app.get(helpers_1.default.createV1Route('/transactions'), (req, res) => __awaiter(this, void 0, void 0, function* () {
            const data = yield transactionEntity.getLastTransactionList();
            res.send(data);
        }));
    }
};
exports.default = transactionRoutes;
//# sourceMappingURL=transaction.js.map