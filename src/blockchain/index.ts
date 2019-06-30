import { fork } from 'child_process';
import * as path from 'path';

import Config from '../config';
import Constant from '../constant';
import { CustomBlock, BlockHeader, RawTx, Stat } from '../interfaces';
import DB from '../platform/db';
import Redis from '../redis';
import Helpers from '../util/helpers';
import logger from '../util/logger';
import Block from './block';
import blockSchema from './schemas/block';
import Transaction from './transaction';
import TxIn from './txIn';

/**
 * @class
 */
class Blockchain {
  /**
   * @param address
   * @param output
   * @returns {Buffer}
   */
  public static buildUnspentKey(address, output): Buffer {
    const params = [Constant.UNSPENT_PREFIX + address];

    params.push(Helpers.toAscendingKey(output.blockIndex));
    params.push(output.txOutId);
    params.push(output.txOutIndex);

    return Buffer.from(params.join('/'));
  }

  public static calcEndPagePos(start, count, perPage): number {
    const total = count - start;

    if (total > Number(perPage)) {
      return Number(perPage);
    }

    return total;
  }

  public static isValidIndex(
    newBlock: Block,
    previousBlock: BlockHeader
  ): void {
    const previousIndex = previousBlock.index;
    const index = newBlock.index;

    if (previousIndex + 1 !== index) {
      const message = `Previous index ${previousIndex} should be 1 less than index ${index}`;

      logger.error(message);

      throw new Error(message);
    }
  }

  public static isValidPreviousHash(
    newBlock: Block,
    previousBlock: BlockHeader
  ): void {
    const previousHash = previousBlock.hash;
    const blockPreviousHash = newBlock.previousHash;

    if (previousHash !== blockPreviousHash) {
      const message = `Previous hash ${previousHash} should equal next previous hash ${blockPreviousHash}`;

      logger.error(message);

      throw new Error(message);
    }
  }

  public static isValidHash(newBlock: Block): void {
    const calculatedHash = newBlock.calculateHash();
    const hash = newBlock.hash;

    if (calculatedHash !== hash) {
      const message = `Calculated hash ${calculatedHash} not equal hash ${hash}`;

      logger.error(message);

      throw new Error(message);
    }
  }

  public static isValidSchema(newBlock: Block): void {
    if (!blockSchema.validate(newBlock)) {
      const message = `Invalid block structure.`;

      logger.error(message);

      throw new Error(`Invalid block structure.`);
    }
  }

  public static isValidBlock(
    newBlock: Block,
    previousBlock: BlockHeader
  ): void {
    try {
      Blockchain.isValidIndex(newBlock, previousBlock);
      Blockchain.isValidPreviousHash(newBlock, previousBlock);
      Blockchain.isValidHash(newBlock);
      Blockchain.isValidSchema(newBlock);
    } catch (error) {
      const message = `Invalid Block Error: ${error}`;

      logger.error(message);

      throw new Error(message);
    }
  }

  public static isValidBlockTxs(txs): void {
    for (let i = 0, length = txs.length; i < length; i++) {
      const transaction = Transaction.fromJS(txs[i]);

      transaction.isValidTransaction();
    }
  }

  public blockchainReader;
  public utxoReader;
  public utxoDB: DB;
  public blockchainDB: DB;
  public worker;
  public lastBlock = null;
  public blockQueue = {};

  private readonly emitter;
  private queue;
  private redis;

  public constructor(emitter, queue) {
    this.emitter = emitter;
    this.queue = queue;
    this.redis = new Redis();

    this.initDBs();
    this.initWorker();
    this.blockSaveHandler();
  }

  public initWorker(): void {
    this.worker = fork(path.join(process.cwd(), 'src/workers/save.js'));

    this.worker.on('message', (msg): void => {
      this.saveWorkerMessageHandler(msg);
    });
  }

  public initDBs(): void {
    const options = {
      noMetaSync: true,
      noSync: true
    };

    this.blockchainDB = new DB(Config.BLOCKCHAIN_DATABASE, options);
    this.utxoDB = new DB(Config.UTXO_DATABASE, options);

    this.blockchainReader = this.blockchainDB.initTxn();
    this.utxoReader = this.utxoDB.initTxn();
  }

  public updateReaders(): void {
    this.blockchainReader.reset();
    this.blockchainReader.renew();

    this.utxoReader.reset();
    this.utxoReader.renew();
  }

  /**
   * @param {number} offset
   * @returns {Object} {blocks: Block[]; pages: number}
   */
  public async getBlockList(offset = 0): Promise<object> {
    const blocks: Block[] = [];
    const prefix = Buffer.from(Constant.CHAIN_PREFIX);
    const cursor = this.blockchainDB.initCursor(this.blockchainReader);

    cursor.goToRange(this.getLastKey(prefix));

    const lastKey = cursor.goToPrev();

    if (!lastKey) {
      cursor.close();

      return { blocks };
    }

    const count = Helpers.readVarInt(lastKey.slice(prefix.length)).value + 1;
    const start = Number(Config.BLOCKS_PER_PAGE) * offset;
    const startKey = Buffer.concat([
      prefix,
      Buffer.from(Helpers.writeVarInt(count - start))
    ]);
    const pages = Math.ceil(count / Number(Config.BLOCKS_PER_PAGE));
    const pos = Blockchain.calcEndPagePos(start, count, Config.BLOCKS_PER_PAGE);
    const blockHash = await this.redis.getBlockCache();

    if (offset === 0 && blockHash.length >= pos) {
      cursor.close();

      return { blocks: blockHash, pages };
    }

    cursor.goToRange(startKey);

    for (let i = 0; i < pos; i++) {
      const key = this.blockchainDB.get(
        this.blockchainReader,
        cursor.goToPrev()
      );
      const block = await this.getBlockByHash(key);

      if (block) {
        blocks.push(block);
      }
    }

    cursor.close();

    return { blocks, pages };
  }

  public async getStatistic(): Promise<object> {
    const stat = this._getStatistic();

    stat.lastBlockIndex = await this.getLastBlockIndex();

    return stat;
  }

  public updateLastBlock(block): void {
    this.lastBlock = Block.createBlockHeader(block);
  }

  public getLastKey(prefix: Buffer): Buffer {
    const maxKeySize = this.blockchainDB.getMaxkeysize();

    if (prefix.length < maxKeySize) {
      return Buffer.concat([
        prefix,
        Buffer.alloc(maxKeySize - prefix.length, 0xff)
      ]);
    }

    return prefix;
  }

  public async getBlockByIndex(
    index,
    includeTx = false
  ): Promise<Block | BlockHeader> {
    const blockHash = this.getBlockHashByIndex(index);
    let block = null;

    if (blockHash) {
      block = await this.getBlockByHash(blockHash, includeTx);
    }

    return block;
  }

  public getBlockHashByIndex(index): Buffer {
    return this.blockchainDB.get(
      this.blockchainReader,
      Buffer.concat([
        Buffer.from(Constant.CHAIN_PREFIX),
        Helpers.writeVarInt(index)
      ])
    );
  }

  public getBlockTxs(hash: Buffer): Buffer {
    const key = Buffer.concat([Buffer.from(Constant.BLOCK_TX_PREFIX), hash]);

    return this.blockchainDB.get(this.blockchainReader, key);
  }

  /**
   * @param hash
   * @returns {Promise<Block>}
   */
  public async viewBlockByHash(hash): Promise<Block> {
    const key = Buffer.from(hash, 'hex');

    return await this.getBlockByHash(key, true);
  }

  /**
   * @param {Buffer} hash
   * @param {boolean} includeTxs
   * @param {"buffer" | "array"} txsResultType
   * @returns {Promise<Block>}
   */
  public async getBlockByHash(
    hash: Buffer,
    includeTxs = false,
    txsResultType: 'base64' | 'buffer' | 'array' = 'array'
  ): Promise<Block> {
    const key = Buffer.concat([
      Buffer.from(Constant.BLOCK_PREFIX),
      hash,
      Buffer.from(Constant.BLOCK_SUFFIX)
    ]);
    const data = this.blockchainDB.get(this.blockchainReader, key);

    if (!data) {
      return null;
    }

    const block = Helpers.JSONToObject(data.toString());

    if (includeTxs) {
      const txs: Buffer = this.getBlockTxs(hash);

      switch (txsResultType) {
        case 'array':
          block.data = await Helpers.decompressData(txs, txsResultType);
          break;
        case 'base64':
          block.data = txs.toString('base64');
          break;
      }

      delete block.txCount;
    }

    return block;
  }

  public _getStatistic(): Stat {
    const key = Buffer.from(Constant.BLOCKCHAIN_STAT);
    const data = this.blockchainDB.get(this.blockchainReader, key);

    if (data !== null) {
      return Helpers.JSONToObject(data.toString());
    }

    return {
      totalMoneyTransferred: 0,
      totalTxs: 0
    };
  }

  /**
   * @returns {BlockHeader}
   */
  public async getLastBlock(): Promise<BlockHeader> {
    if (this.lastBlock) {
      return this.lastBlock;
    }

    let block = null;
    const prefix = Buffer.from(Constant.CHAIN_PREFIX);
    const cursor = this.blockchainDB.initCursor(this.blockchainReader);

    if (cursor.goToRange(this.getLastKey(prefix))) {
      const data = cursor.goToPrev();

      if (data) {
        const blockHash = this.blockchainDB.get(this.blockchainReader, data);

        block = await this.getBlockByHash(blockHash);
        this.updateLastBlock(block);
      }
    }

    cursor.close();

    return block;
  }

  public async getLastBlockIndex(): Promise<number | null> {
    if (this.lastBlock) {
      return this.lastBlock.index;
    }

    const block = await this.getLastBlock();

    return block ? block.index : null;
  }

  public resetLastBlock(): void {
    this.lastBlock = null;
  }

  public deleteBlockByIndex(index): Promise<boolean> {
    return new Promise(
      async (resolve, reject): Promise<void> => {
        const indexKey = Buffer.concat([
          Buffer.from(Constant.CHAIN_PREFIX),
          Helpers.writeVarInt(index)
        ]);
        const hash = this.blockchainDB.get(this.blockchainReader, indexKey);
        const blockKey = Buffer.concat([
          Buffer.from(Constant.BLOCK_PREFIX),
          hash,
          Buffer.from(Constant.BLOCK_SUFFIX)
        ]);
        const data = this.blockchainDB.get(this.blockchainReader, blockKey);

        if (!data) {
          return resolve(true);
        }

        const block = Helpers.JSONToObject(data.toString());
        const blockTxKey = Buffer.concat([
          Buffer.from(Constant.BLOCK_TX_PREFIX),
          Buffer.from(block.hash, 'hex')
        ]);
        const txRaw = this.blockchainDB.get(this.blockchainReader, blockTxKey);
        const txList = (await Helpers.decompressData(
          txRaw,
          'array'
        )) as Transaction[];
        const blockData = [];

        blockData.push([this.blockchainDB.DBI, blockKey]);
        blockData.push([this.blockchainDB.DBI, indexKey]);

        txList.forEach((tx): void => {
          const txKey = Buffer.concat([
            Buffer.from(Constant.TRANSACTION_PREFIX),
            Buffer.from(tx.id, 'hex')
          ]);

          blockData.push([this.blockchainDB.DBI, txKey]);

          // @todo may need to replace loop
          tx.txOuts.forEach((txOut): void => {
            if (txOut.address !== '') {
              const address = Helpers.toShortAddress(txOut.address);
              const unspentKey = Blockchain.buildUnspentKey(address, txOut);

              blockData.push([this.blockchainDB.DBI, unspentKey]);
            }
          });
        });

        this.blockchainDB.batchWrite(
          blockData,
          {},
          async (error): Promise<void> => {
            this.updateReaders();
            this.resetLastBlock();

            const lastBlock = await this.getLastBlock();

            this.updateLastBlock(lastBlock);

            if (error) {
              return reject(error);
            }

            return resolve(true);
          }
        );
      }
    );
  }

  public getUnspentOutputsByAddress(address): TxIn[] {
    const utxo = [];
    const shortAddress = Helpers.toShortAddress(address);
    const unspentKey = Buffer.from(
      Constant.UNSPENT_PREFIX + shortAddress + '/'
    );
    const cursor = this.utxoDB.initCursor(this.utxoReader);

    for (
      let found = cursor.goToRange(unspentKey);
      found !== null;
      found = cursor.goToNext()
    ) {
      if (Buffer.compare(unspentKey, found.slice(0, unspentKey.length))) {
        break;
      }

      const output = this.utxoDB.get(this.utxoReader, found);

      if (!output) {
        continue;
      }

      const data = Helpers.JSONToObject(output.toString());
      const input = new TxIn(
        data.txOutIndex,
        data.txOutId,
        data.amount,
        data.address,
        data.signature
      );

      utxo.push(input);
    }

    cursor.close();

    return utxo;
  }

  /**
   * @param {string} tid
   * @returns {boolean}
   */
  public isTransactionInBlockchain(tid: string): boolean {
    return !!this.getTransactionIndex(Buffer.from(tid, 'hex'));
  }

  public async getTransactionById(tid: string): Promise<RawTx | null> {
    return await this.getTransactionFromBlockById(tid);
  }
  /**
   * @param {string} tid
   * @returns {null | RawTx}
   */
  public async getTransactionFromBlockById(tid: string): Promise<RawTx | null> {
    const txInfo = this.getTransactionIndex(Buffer.from(tid, 'hex'));

    if (txInfo) {
      const { height, index } = Helpers.JSONToObject(txInfo.toString());
      const blockHash: Buffer = this.getBlockHashByIndex(height);

      if (blockHash) {
        const txsBuf: Buffer = this.getBlockTxs(blockHash);
        const txs = await Helpers.decompressData(txsBuf, 'array');

        if (txs[index].id === tid) {
          return txs[index];
        }
      }
    }

    return null;
  }

  /**
   * Getting a list of last transactions (Only regular transactions)
   * @returns {Object} {transactionList: Transaction[]}
   */
  public async getLastTransactionList(): Promise<object> {
    const transactionList = await this.redis.getTransactionCache();

    return { transactionList };
  }

  public saveBlock(block): Promise<boolean> {
    this.updateLastBlock(block);

    return new Promise(
      async (resolve): Promise<void> => {
        this.worker.send({
          type: 'add',
          block
        });

        await this.onBlockAddedToChain();
        this.updateReaders();

        resolve(true);
      }
    );
  }

  public saveWorkerMessageHandler(msg): void {
    switch (msg.type) {
      case 'saved':
        this.emitter.emit('block_added_to_chain');
        break;
    }
  }

  public onBlockAddedToChain(): Promise<boolean> {
    return new Promise((resolve): void => {
      const handler = (): void => {
        this.emitter.removeListener('block_added_to_chain', handler);

        resolve(true);
      };

      this.emitter.on('block_added_to_chain', handler);
    });
  }

  public getTransactionIndex(tid: Buffer): Buffer {
    const key: Buffer = Buffer.concat([
      Buffer.from(Constant.TRANSACTION_PREFIX),
      tid
    ]);

    return this.blockchainDB.get(this.blockchainReader, key);
  }

  public getUnspentTransactionsForAddress(address): object[] {
    return this.getUnspentOutputsByAddress(address);
  }

  public getBalanceForAddress(address): number {
    const utxo = this.getUnspentOutputsByAddress(address);

    return Helpers.sumArrayObjects(utxo, 'amount');
  }

  public addBlockToChain(newBlock: CustomBlock, emit = true): void {
    this.blockQueue[newBlock.hash] = newBlock;
    this.queue.add({ hash: newBlock.hash, emit });
  }

  public blockSaveHandler() {
    this.queue.process(async (job, done) => {
      const newBlock = this.blockQueue[job.data.hash];

      delete this.blockQueue[job.data.hash];

      try {
        if (!newBlock.compressed) {
          await this.saveBlock(newBlock);
          logger.info(`Block added: ${newBlock.hash}`);
        } else {
          let compressedTxs;

          const currentBlock: BlockHeader = await this.getLastBlock();

          if (newBlock.compressed) {
            compressedTxs = newBlock.compressed;

            delete newBlock.compressed;
          }

          Blockchain.isValidBlock(newBlock, currentBlock);
          Blockchain.isValidBlockTxs(newBlock.data);

          if (!compressedTxs) {
            compressedTxs = await Helpers.compressData(newBlock.data, 'base64');
          }

          newBlock.data = compressedTxs;

          await this.saveBlock(newBlock);

          logger.info(`Block added: ${newBlock.hash}`);

          if (process.env.NODE_ENV === 'dev') {
            logger.info(
              `Block info: ${JSON.stringify(Block.createBlockHeader(newBlock))}`
            );
          }
        }

        this.emitter.emit('update_last_block');
        this.emitter.emit('new_last_index', newBlock.index);
      } catch (error) {
        const message = `Failed to add block: ${error}`;

        logger.error(message);

        throw new Error(message);
      }

      done();
    });
  }

  public async updateChain(blocks, synchronized = 0): Promise<void> {
    let length = blocks.length;

    while (length--) {
      let block = blocks[length];

      if (synchronized) {
        const compressedTxs = block.data;
        const buf = Buffer.from(compressedTxs, 'base64');

        block.data = await Helpers.decompressData(buf, 'array');
        block = Block.fromJS(block);
        block.compressed = compressedTxs;
      }

      this.addBlockToChain(block, false);
    }
  }
}

export default Blockchain;
