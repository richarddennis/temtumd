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
const querystring = require("querystring");
const WebSocket = require("ws");
class NodeStatus {
    constructor(emitter, blockchain) {
        this.connections = {};
        this.emitter = emitter;
        this.blockchain = blockchain;
        this.initSocketConnection();
        this.initEmitterHandler();
    }
    static verifyClient(info, cb) {
        const params = querystring.parse(info.req.url.replace(/^.*\?/, ''));
        if (!params.token) {
            return cb(false, 401, 'Unauthorized');
        }
        if (params.token === process.env.ADMIN_CLIENT_WEBSOCKET_SECRET) {
            cb(true);
        }
        else {
            cb(false, 401, 'Unauthorized');
        }
    }
    initEmitterHandler() {
        this.emitter.on('new_last_index', (index) => {
            this.sendMessage({
                type: 'lastBlock',
                lastBlock: index
            });
        });
        this.emitter.on('set_peer_status', (data) => {
            this.sendMessage({
                type: 'peerStatus',
                peer: data.peer,
                status: data.status
            });
        });
    }
    initSocketConnection() {
        const wss = new WebSocket.Server({
            port: Number.parseInt(process.env.ADMIN_CLIENT_WEBSOCKET_PORT),
            verifyClient: NodeStatus.verifyClient
        });
        wss.on('connection', (ws) => __awaiter(this, void 0, void 0, function* () {
            const connectionTime = Date.now();
            const lastBlock = yield this.blockchain.getLastBlock();
            this.connections[connectionTime] = ws;
            this.sendMessage({
                type: 'lastBlock',
                lastBlock: lastBlock.index
            });
            ws.on('close', () => {
                delete this.connections[connectionTime];
            });
        }));
    }
    sendMessage(message) {
        for (const connectionTime in this.connections) {
            if (this.connections.hasOwnProperty(connectionTime)) {
                this.connections[connectionTime].send(JSON.stringify(message));
            }
        }
    }
}
exports.default = NodeStatus;
//# sourceMappingURL=status.js.map