# Temtum node

[www.dragoninfosec.com](https://www.dragoninfosec.com/)

### Requirements
1. Node.js 10.11.2+
2. Git 1.7+

### Installation

```
npm install
npm install pm2 -g
```

### Start

#### Setup environment
Create ```.env``` file by ```.env.example``` in the root folder.

#### Development
```
npm run dev
pm2 log
```

#### Production
```
npm start
```

#### Block structure
```
{
    "index": number,
    "hash": string,
    "previousHash": string,
    "timestamp": number,
    "data": [{
        "type": "coinbase",
        "txIns": [{
            "txOutIndex": number
        }],
        "txOuts": [{
            "amount": number,
            "address": string
        }],
        "timestamp": number,
        "id": number
    }]
}
```
### Example
```
{
    "index": 7024,
    "hash": "60794e8acd55203faebe05f468394cf5fbae7e7ca166a9590016aee8b83283d0",
    "previousHash": "3fe85c89baa8c77621cd19ae1298fe75b69686ebbffd1d53e4af23a2388673b6",
    "timestamp": 1530941569,
    "data": [{
        "type": "coinbase",
        "txIns": [{
            "txOutIndex": 7024
        }],
        "txOuts": [{
            "amount": 0,
            "address": ""
        }],
        "timestamp": 1530941569,
        "id": "8c5db06e8ea6090a4b8c4c053b667d5d5897b72b44cb515c7ccb359fc33d0a38"
    }]
}
```

#### Transaction structure
```
{
    "type": "coinbase",
    "txIns": [{
        "txOutIndex": number
    }],
    "txOuts": [{
        "amount": number,
        "address": string
    }],
    "timestamp": number,
    "id": number
}
```
### Example
```
{
    "type": "coinbase",
    "txIns": [{
        "txOutIndex": 7024
    }],
    "txOuts": [{
        "amount": 0,
        "address": ""
    }],
    "timestamp": 1530941569,
    "id": "8c5db06e8ea6090a4b8c4c053b667d5d5897b72b44cb515c7ccb359fc33d0a38"
}
```

## Endpoints

##### Get blockchain
```
curl http://localhost:3001/v1/blocks/:page(\d+)?
```
where *page: number* is not mandatory (return first page if no page set)\
Response: *{ blocks: array of objects(Block), pages: number }*

##### Get block by hash
```
curl http://localhost:3001/v1/block/:hash([a-zA-Z0-9]{64})
```
where *hash: string* is a hash of the block\
Response: *block: object(Block)*\
Example:
```
curl http://localhost:3001/v1/block/04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534b
```

##### Get block by index
```
curl http://localhost:3001/v1/block/:index(\\d+)
```
where *index: number* is an index of the block\
Response: *block: object(Block)*\
Example:
```
curl http://localhost:3001/v1/block/2
```

##### Flexible search method
```
curl -H "Content-type:application/json" --data '{"query" : "2"}' http://localhost:3001/v1/search
```
Provide search in blocks by hash and index and in transactions by hash.\
where *query* can be hash of block or transaction or index of a block(number)\
Response: *block: object(Block)* || *transaction: object(Transaction)*

##### Get transaction by id
```
curl http://localhost:3001/v1/transaction/:id([a-zA-Z0-9]{64})
```
where *id: string* (hash of the transaction)\
Response: *transaction: object*\
Example:
```
curl http://localhost:3001/v1/transaction/04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534b
```

##### Get balance
```
curl http://localhost:3001/v1/address/:address/balance
```
where *address: string* is wallet\
Response: *{balance: balance: number}*\
Example:
```
curl http://localhost:3001/v1/address/04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534b/balance
```

##### Create address

```
curl -X POST http://localhost:3001/v1/address/create
```
Response: *{address: address}*, where *address: string*

- clean the database:
```
npm run clear:db
```
