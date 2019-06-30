"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const type_1 = require("./type");
/**
 * @class
 */
class MessageCreator {
    static queryChainLengthMsg() {
        return {
            type: type_1.default.QUERY_LAST_BLOCK
        };
    }
    static readyToMine() {
        return {
            type: type_1.default.READY_TO_MINE
        };
    }
    static querySyncBlockchain(start) {
        return {
            type: type_1.default.QUERY_SYNC_BLOCKCHAIN,
            payload: { start }
        };
    }
    static updatePeerStatus(peerList) {
        return {
            type: type_1.default.UPDATE_PEER_STATUS,
            payload: { peerList }
        };
    }
    static responseSyncBlockchain(blocks) {
        return {
            type: type_1.default.RESPONSE_SYNC_BLOCKCHAIN,
            payload: { blocks }
        };
    }
    static queryLastBlockHeader() {
        return {
            type: type_1.default.QUERY_LAST_BLOCK_HEADER
        };
    }
    static responseLastBlockHeader(block) {
        return {
            type: type_1.default.RESPONSE_LAST_BLOCK_HEADER,
            payload: { block }
        };
    }
    static queryAllMsg(start) {
        return {
            type: type_1.default.QUERY_ALL,
            payload: { start }
        };
    }
    static responseChainMsg(blocks) {
        return {
            type: type_1.default.RESPONSE_BLOCKCHAIN,
            payload: { blocks }
        };
    }
    static responseNewMsg(blocks) {
        return {
            type: type_1.default.RESPONSE_BLOCKCHAIN,
            payload: { blocks }
        };
    }
    static requestPeerReady() {
        return {
            type: type_1.default.REQUEST_PEER_READY
        };
    }
    static responsePeerReady(peerList, leader) {
        return {
            type: type_1.default.RESPONSE_PEER_READY,
            payload: { peerList, leader }
        };
    }
    static responseLatestMsg(block) {
        return {
            type: type_1.default.RESPONSE_LAST_BLOCK,
            payload: { block }
        };
    }
    static authorizeClient() {
        return {
            type: type_1.default.AUTHORIZE_CLIENT
        };
    }
    static updateClientToken(leader) {
        return {
            type: type_1.default.UPDATE_CLIENT_TOKEN,
            payload: { leader }
        };
    }
    static wrongClientToken() {
        return {
            type: type_1.default.WRONG_TOKEN
        };
    }
    static queryPeers() {
        return {
            type: type_1.default.QUERY_PEERS
        };
    }
    static responsePeers(peerList) {
        return {
            type: type_1.default.RESPONSE_PEERS,
            payload: { peerList }
        };
    }
    static updatePeerList(peerList) {
        return {
            type: type_1.default.UPDATE_PEER_LIST,
            payload: { peerList }
        };
    }
    static requestPeerDelete(peer) {
        return {
            type: type_1.default.REQUEST_PEER_DELETE,
            payload: { peer }
        };
    }
    static responseRandomBlock(block) {
        return {
            type: type_1.default.RESPONSE_RANDOM_BLOCK,
            payload: { block }
        };
    }
    static requestRandomBlock() {
        return {
            type: type_1.default.REQUEST_RANDOM_BLOCK
        };
    }
    static queryTransactionPoolMsg() {
        return {
            type: type_1.default.QUERY_TRANSACTION_POOL
        };
    }
    static responseBlockByIndex(block) {
        return {
            type: type_1.default.SEND_BLOCK_BY_INDEX,
            payload: { block }
        };
    }
    static requestBlockByIndex(index) {
        return {
            type: type_1.default.GET_BLOCK_BY_INDEX,
            payload: { index }
        };
    }
    static responseTransactionPoolMsg(txPool) {
        return {
            type: type_1.default.RESPONSE_TRANSACTION_POOL,
            payload: { txPool }
        };
    }
}
exports.default = MessageCreator;
//# sourceMappingURL=creator.js.map