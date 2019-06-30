"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cors = require("cors");
const restana = require("restana");
const helpers_1 = require("../util/helpers");
const logger_1 = require("../util/logger");
const shared_1 = require("./shared");
const address_1 = require("./routes/address");
const block_1 = require("./routes/block");
const common_1 = require("./routes/common");
const transaction_1 = require("./routes/transaction");
const address_2 = require("./entities/address");
const block_2 = require("./entities/block");
const common_2 = require("./entities/common");
const transaction_2 = require("./entities/transaction");
const controller_1 = require("./rpc/controller");
const index_1 = require("./rpc/index");
const validation_1 = require("./rpc/validation");
class HttpServer {
    static errorHandler(error, req, res) {
        const status = error.status ? error.status : 500;
        logger_1.default.error(error);
        const response = {
            message: status === 500
                ? 'Something went wrong'
                : error.errors && error.errors.length > 0
                    ? error.errors[0].messages[0]
                    : error.message
        };
        if (error.options) {
            Object.assign(response, error.options);
        }
        res.send(response, status);
    }
    constructor(blockchain, wallet, node) {
        this.blockchain = blockchain;
        this.wallet = wallet;
        this.node = node;
        this.app = restana({
            ignoreTrailingSlash: true,
            errorHandler: HttpServer.errorHandler
        });
        this.shared = new shared_1.default(blockchain, wallet);
        this.rpcController = new controller_1.default(this.shared);
        this.addressEntity = new address_2.default(this.shared);
        this.blockEntity = new block_2.default(blockchain, this.shared);
        this.commonEntity = new common_2.default(this.shared);
        this.transactionEntity = new transaction_2.default(blockchain, node, this.shared);
        this.init();
    }
    init() {
        this.app.use((req, res, next) => {
            let data = '';
            req.on('data', (chunk) => {
                data += chunk;
            });
            req.on('end', () => {
                req.raw = data;
                req.body = helpers_1.default.JSONToObject(data, false);
                next();
            });
        });
        this.app.use(cors());
        address_1.default.init(this.app, this.addressEntity);
        block_1.default.init(this.app, this.blockEntity);
        common_1.default.init(this.app, this.commonEntity);
        transaction_1.default.init(this.app, this.transactionEntity);
        this.app.post('/json-rpc', index_1.default({
            methods: this.rpcController.getMethods(),
            beforeMethods: validation_1.default
        }));
    }
    listen(port) {
        this.app.start(port).then(() => {
            logger_1.default.info('Listening http on port: ' + port);
        });
    }
}
exports.default = HttpServer;
//# sourceMappingURL=index.js.map