
# Explorer Server

## Overview
Introducing a decentralized, provably fair global gaming platform, built on the most advanced blockchain technology available today. Peerplays brings a new paradigm of fairness, speed, transparency, and security to the global gaming industry.

## Purpose
The purpose of this project is to assist in development and debugging on the Peerplays BlockChain. This server will receive blocks from the BlockChain and push them into a Mongo
database where they can easily be queried or inspected. This project is not meant to be a production server, and production applications should be communicating
with the BlockChain directly.

## How do I get set up?
### Installation
1. Install dependencies: ```npm install```
2. If you do not have mongodb installed on your local machine then follow [this](https://docs.mongodb.com/manual/tutorial) tutorial, otherwise ...
3. Start mongodb:  ```mongod```
4. To verify that mongodb is running, visit 'localhost:27017' in your browser

## Data Population
### Option A - Without listening for new blocks.
1. Clean your database with ```npm run clean```
2. Populate your database with ```npm run populate```

### Option B - While listening for new blocks.
*This method is recommended if you wish to leave the server running and allow it to continually fetch and store blocks*
1. Run the start script ```npm start```

### Scripts
You may edit each one of these scripts constant values for further flexibility. For example, the getTransaction script can be modified to get any transaction object, but by default, gets the first transaction in the PeerPlays Blockchain.

* Clean databases - ```npm run clean```
* Create databases with default collections - ``` npm run create```
* Populate the database with Blocks - ```npm run populate```
* Start listening for new blocks, and populating the database - ``` npm start ```

### Connecting
You may want to connect to different databases. This can be achieved by passing the environment name via the command line.
```npm run listen [live|test|dev]```

## License

MIT
