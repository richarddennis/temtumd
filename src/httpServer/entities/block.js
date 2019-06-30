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
const customErrors_1 = require("../../errors/customErrors");
class BlockEntity {
    constructor(blockchain, shared) {
        this.blockchain = blockchain;
        this.shared = shared;
    }
    blocksList(page = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.blockchain.getBlockList(page);
        });
    }
    blockByHash(block) {
        return __awaiter(this, void 0, void 0, function* () {
            if (/([a-zA-Z0-9]{64})/.test(block)) {
                return yield this.shared.viewBlockByHash(block);
            }
            if (/(\d+)/.test(block)) {
                return yield this.shared.getBlockByIndex(block);
            }
            throw new customErrors_1.default.BadRequest('Invalid hash or index');
        });
    }
    blockLast() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.shared.getLastBlock();
        });
    }
    blockLastIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            const index = yield this.blockchain.getLastBlockIndex();
            return { index };
        });
    }
}
exports.default = BlockEntity;
//# sourceMappingURL=block.js.map