const MongoClient = require('mongodb');
const cleanMongo = require('clean-mongo');
const Peerplays = require('peerplaysjs-lib');
const ChainStore = Peerplays.ChainStore;

const { Apis } = require('peerplaysjs-ws');

const config = require('./config');

class ExplorerServer {

  constructor (connect, ready) {
    
    if (typeof connect === 'function') {
      ready = connect;
      connect = true;
    }
    
    this.collections = {
      transactions: false,
      blocks: false
    };
    
    this.count_livenet_blocks = 0;

    // Used in some cases when we don't need to be connected to the BlockChain
    if (connect) {

      if (!config.BLOCKCHAIN || config.BLOCKCHAIN.length === '') {
        return ready(new Error('ExplorerServer> BlockChain is not defined, check your configuration.'));
      }

      // Connect to the BlockChain.
      this.api = Apis.instance(config.BLOCKCHAIN, true);

      // Listen for the BlockChain to be ready.
      this.api.init_promise.then(() => {
        
        // Initialize the ChainStore so its ready to receive updates from the BlockChain.
        ChainStore
          .init()
          .then(() => {
            console.log(`ExplorerServer> Connected to ${config.BLOCKCHAIN}`);
            return ready(null, true);
          });
      });
    }

  }

  /**
   * Initialize the database and then start listening for new Blocks.
   * 
   * @memberof ExplorerServer
   */
  start () {
    this.createCollections(() => this.startListening());
  }

  /**
   * Initalize the Database, ensure the proper collections exist.
   * 
   * @param {function} callback Function to execute when the collections are created.
   * @memberof ExplorerServer
   */
  createCollections (callback) {

    // Use connect method to connect to the server & create collections for Livenet Blocks
    MongoClient.connect(config.MONGO, (error, db) => { 
      if (error) {
        return callback(error);
      }
  
      console.log(`ExplorerServer> Connected to ${config.MONGO}`);
  
      db.createCollection('blocks', this.collectionCreated.bind(this, db, 'blocks', callback));
      db.createCollection('meta', this.collectionCreated.bind(this, db, 'meta', callback));
    });
  
  }

  /**
   * Fired each time a colleciton is created.
   * 
   * @param {any} db Instance of the Mongo Database
   * @param {string} collection The collection that was created
   * @param {function} callback Callback to fire when all collections are created.
   * @param {error} error An error thrown when trying to create a collection
   * @memberof ExplorerServer
   */
  collectionCreated (db, collection, callback, error) {

    if (error) {
      return callback(error);
    }
  
    console.log(`ExplorerServer> Collection ${collection} created on ${config.MONGO}.`);
  
    this.collections[collection] = true;

    if (this.collections.blocks && this.collections.meta) {

      // Close the connection to Mongo.
      db.close();

      return callback(null);
    }
  
  }

  /**
   * Connect to the BlockChain and start listening for new Blocks.
   * 
   * @memberof ExplorerServer
   */
  startListening () {
    ChainStore.subscribe(this.updateDatabase.bind(this));
  }

  /**
   * Called when a new Block was written, will then get the data and push it into Mongo.
   * 
   * @memberof ExplorerServer
   */
  updateDatabase () {
    
    // Get the dynamicGlobal which provides metadata, like the latest block number.
    this.getObject('2.1.0', (error, dynamicGlobal) => {

      if (error) {
        throw error;
      }

      if (!dynamicGlobal) {
        throw new Error('ExplorerServer> Unable to retrieve the head block, check your connection to the BlockChain.');
      }

      // Update the cached dynamic global object.
      this.updateDynamicGlobal(dynamicGlobal, (error) => {

        if (error) {
          // Log the error but allow the next operation to continue.
          console.error(`Error updating the dynamic global : ${error.message}`);
        }

        // Get the latest block reference in the dynamicGlobal.
        this.insertBlock(dynamicGlobal.head_block_number, (error, block) => {

          if (error) {
            return console.error(`Error inserting block : ${error.message}`);
          }

          this.logBlockData(block);
        });

      })

    });

  }

  /**
   * Get a single object from the BlockChain. 
   * 
   * @param {string} assetId The ID of the transaction to retrive.
   * @param {function} callback Called with the found transaction object.
   * @memberof ExplorerServer
   */
  getObject (assetId, callback) {

    if (typeof assetId === 'function') {
      callback = assetId;
      assetId = null;
    } 

    // Capture both cases where the assetId isn't passed, or its passed as null.
    if (!assetId) {
      assetId = '1.11.10000';
    }

    this.api.db_api()
      .exec('get_objects', [[assetId]])
      .then((blockObject) => {
        // Return the first object that matches the query
        return callback(null, blockObject[0]);
      });
  }

  /**
   * Get a single block from the BlockChain
   * 
   * @param {any} blockNumber 
   * @param {any} callback 
   * @returns 
   * @memberof ExplorerServer
   */
  getBlock (blockNumber, callback) {
    console.log('Block Number : ', blockNumber);

    if (typeof blockNumber === 'function') {
      callback = blockNumber;
      return callback(new Error('ExplorerServer> Missing required block number in getBlock call.'));
    }

    this.api.db_api()
      .exec('get_block', [blockNumber])
      .then((block) => {
        return callback(null, block);
      });
  }

  /**
   * Populate the MongoDB with Blocks.
   * 
   * @param {function} callback 
   * @memberof ExplorerServer
   */
  populate (callback) {

    MongoClient.connect(config.MONGO, (error, db) => {

      if (error) {
        return callback(error);
      }

      // Set the cursor to our newest id.
      var cursor = db.collection('blocks').find().limit(1).sort({ _id: -1 });

      // Get the object the cursor is pointing at.
      cursor.nextObject((error, item) => {

        var startingBlock;

        if (error) {
          db.close();
          return callback(error);
        }

        if (item) {
          startingBlock = item._id + 1; // Start block, move forward from here.
          console.log(`ExplorerServer> Starting from block ${startingBlock}`);
        } else {
          startingBlock = 1;
          console.log('ExplorerServer> Starting from 1');
        }

        // Start listening for new blocks, this should happen after we have the right cursor position.
        this.startListening();

        // Start the process of walking the blocks.
        this.populateBlock(startingBlock);

        // Close the DB connection.
        db.close();

      });
    
    });

  }

  /**
   * Start recursively insert blocks into the MongoDB
   * 
   * @param {number} blockNumber The block number to insert into Mongo.
   * @memberof ExplorerServer
   */
  populateBlock (blockNumber) {

    this.insertBlock(blockNumber, (error, block) => {

      // If we didn't insert a block then we're up to date.
      if (!block) {
        // Call the next part to start listening for socket events.
        return;
      }

      // Recursive but taking advantage of setImmediate so we do not blow the stack.
      setImmediate(this.populateBlock.bind(this, blockNumber + 1), (error) => {
        if (error) {
          console.error(error);
        }
      }, 0);

    });

  }

  /**
   * Retrieve a block from the BlockChain and put it into the MongoDB
   * 
   * @param {number} blockNumber The number of the block to insert into Mongo.
   * @param {function} callback 
   * @memberof ExplorerServer
   */
  insertBlock (blockNumber, callback) {
    
    this.api.db_api().exec('get_block', [blockNumber]).then(block => {

      // When a block is not found we assume we are up to date.
      if (!block) {
        return callback(null);
      }

      // Establish a connection to the MongoDatabase.
      MongoClient.connect(config.MONGO, (error, db) => {

        if (error) {
          return callback(error);
        }

        // Apply an id to the object that will be inserted in Mongo.
        block._id = blockNumber;

        // Insert the block into the blocks collection in Mongo
        db.collection('blocks').insertOne(block, (error) => {

          // Close the connection to Mongo.
          db.close();

          if (error) { 
            return callback(error);
          }

          this.count_livenet_blocks = this.count_livenet_blocks + 1;

          // Only print a status update every 100 blocks.
          if ((blockNumber % 100 === 0)) {
            block.backlog = true;
            this.logBlockData(block);
          }

          return callback(null, block);

        });

      });

    });

  }


  /**
   * Update the DynamicGlobal object stored in the database. 
   * 
   * @param {object} dynamicGlobal 
   * @param {function} callback 
   * @memberof ExplorerServer
   */
  updateDynamicGlobal (dynamicGlobal, callback) {
     // Establish a connection to the MongoDatabase.
     MongoClient.connect(config.MONGO, (error, db) => {

      var options;

      if (error) {
        return callback(error);
      }

      // Create the document if it does not exist.
      options = {
        upsert: true
      };

      // Update the specific dynamic global document in the meta collection.
      db.collection('meta').update({_id: '2.1.0'}, dynamicGlobal, options, (error) => {

        // Clean up the connection to the database
        db.close();

        if (error) {
          return callback(error);
        }

        return callback(error, null);

      });

    });
  }

  /**
   * Cleanup the database in the currently configured environment.
   * 
   * @param {any} callback 
   * @memberof ExplorerServer
   */
  cleanDatabase (callback) {

    cleanMongo(config.MONGO)
      .then(this.closeDatabaseConnection.bind(this, `ExplorerServer> Cleaning ${config.MONGO}`))
      .then(callback)
      .catch((error) => {
        return callback(error);
      });
  }

  /**
   * Console log data relating to a block.
   * 
   * @param {JSON} block Single block in the BlockChain
   * @memberof ExplorerServer
   */
  logBlockData (block) {
    // Edit this function to log more or less information.
    console.log('\nExplorerServer>----- DB Meta Info -----');
    console.log(`ExplorerServer> Block ${block._id} Added.`);
    if (block.backlog) {
      console.log('ExplorerServer> Backlog');
    }
    //console.log(block);
    console.log('ExplorerServer>---- Block Info -----\n');
  }

  /**
   * Close the open database connection.
   * 
   * @param {string} message A log message for when the close has happened.
   * @param {any} db 
   * @memberof ExplorerServer
   */
  closeDatabaseConnection(message, db) {
    console.log(message);
    db.close();
  }

}

module.exports = ExplorerServer;
