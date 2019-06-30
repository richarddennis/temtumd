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
class CommonEntity {
    constructor(shared) {
        this.shared = shared;
    }
    search(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.shared.search(query);
            if (result.block) {
                return result.block;
            }
            if (result.transaction) {
                return result.transaction;
            }
            return result;
        });
    }
    statistic() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.shared.getStatistic();
            return data;
        });
    }
}
exports.default = CommonEntity;
//# sourceMappingURL=common.js.map