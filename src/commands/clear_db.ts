import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as redis from 'redis';
import * as rimraf from 'rimraf';

import Config from '../config';

dotenv.load();

const args = process.argv.slice(2);
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

args.forEach((key) => {
  const path = `node/${key}`;

  if (fs.existsSync(`${path}/data.mdb`)) {
    rimraf(`${path}/data.mdb`, () => true);
    rimraf(`${path}/lock.mdb`, () => console.log(`${key} removed!`));
  }
});

function clearRedis() {
  const len = 1000;

  function scan() {
    return new Promise((resolve, reject) => {
      const commands = [];

      redisClient.scan('0', 'MATCH', '*bull*', 'COUNT', len, (err, reply) => {
        if (err) {
          reject(err);
        }

        const keys = reply[1];

        keys.forEach((val) => {
          commands.push(['del', val]);
        });

        resolve(commands);
      });
    });
  }

  scan().then((commands: any[]) => {
    if (commands.length !== len) {
      commands.push(['del', Config.REDIS_BLOCK_CACHE]);
      commands.push(['del', Config.REDIS_TX_CACHE]);

      redisClient.multi(commands).exec(() => {
        console.log('redis cache cleared!');

        redisClient.quit();
      });
    } else {
      redisClient.multi(commands).exec(() => {
        clearRedis();
      });
    }
  });
}

try {
  clearRedis();
} catch (err) {
  console.error(err);
}
