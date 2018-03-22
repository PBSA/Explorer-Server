const express = require('express');
const MongoClient = require('mongodb');
const config = require('../config');
const errors = require('../utils/errors');

const BLOCK_NOT_FOUND = 'Block does not exist.';

/** http://docs.bitshares.org/api/database.html#objects */

module.exports = function (blockchainAPI) {

  var blocksRouter = express.Router({
    extendParams: true
  });

  // If the reference is missing the routes will not work, throw an error to alert the developers.
  if (!blockchainAPI) {
    throw new Error('Missing reference to the BlockChain API.');
  }

  /**
   * Get a block from the BlockChain, defaults to cache first if available.
   * 
   * @param {string} blockNumber The Block to retrieve.
   * @param {function} callback 
   * @returns 
   */
  function getBlock (blockNumber, callback) {

    // Make sure the blockNumber is a valid Number.
    if (isNaN(blockNumber)) {
      return callback(new Error('ID of block is invalid, should be an integer.'));
    }

    // Convert from string to integer
    blockNumber = parseInt(blockNumber, 10);

    // Connect to Mongo to first check if we already have this block.
    MongoClient.connect(config.MONGO, (error, database) => {

      var collection, options, query;

      if (error) {
        return callback(error);
      }

      // Select the blocks collection.
      collection = database.collection('blocks');

      // Build a query for the specific id.
      query = {
        _id: blockNumber
      };

      // Limit the number of rows to 1, there should only ever be a single block with that id either way.
      options = {
        limit: 1
      };

      // request the block from Mongo.
      collection.findOne(query, options, (error, block) => {

        if (error) {
          return callback(error);
        }

        // If we have found the block, return the data and close the connection.
        if (block) {
          // Remove the ID, this is an artifical value that we use to reference the block in the database.
          delete block._id;
          database.close();
          return callback(null, block);
        }

        // Request block information from the block chain.
        blockchainAPI.db_api()
          .exec('get_block', [blockNumber])
          .then((block) => {
          
            // If the block does not exist, return an error.
            if (!block) { 
              return callback(new Error(BLOCK_NOT_FOUND));
            }

            // Add an id value to the block.
            block._id = blockNumber;

            // Insert the block into Mongo.
            collection.insertOne(block, (error) => {

              if (error) {
                return callback(error);
              }

              // Remove the ID, this is an artifical value that we use to reference the block in the database.
              delete block._id;

              // Return the Fresh block.
              return callback(null, block);

            });

          })
          .catch(error => callback(error));

      });

    });

  }

  /**
   * Retrieve the block from the blockchain.
   * 
   * @param {number} blockNumber 
   * @returns 
   */
  function getBlockFromBlockchain (blockNumber) {

    // Make sure the blockNumber is valid.
    // Throwing an error here so that the promise all catch will be able to handle it.
    if (isNaN(blockNumber)) {
      throw new Error('Invalid block number.');
    }

    return blockchainAPI.db_api()
      .exec('get_block', [blockNumber])
      .then((block) => {
        
        if (!block) {
          throw new Error(BLOCK_NOT_FOUND);
        }
        
        block._id = blockNumber;

        return new Promise((resolve, reject) => {

          // Save the block to the database.
          saveBlock(block, (error) => {

            if (error) {
              return reject(new Error('Failed to save block.'));
            }

            return resolve(block);

          });

        });

      });
  }

  /**
   * Request all of the blocks from the blockchain.
   * 
   * @param {number[]} blockNumbers 
   * @param {function} callback 
   * @returns 
   */
  function getBlocksFromBlockchain (blockNumbers, callback) {

    var requests = [];

    // Allow them to pass either a single block number or an array.
    if (!Array.isArray(blockNumbers)) {
      blockNumbers = [blockNumbers];
    }

    // If any of the block numbers are not actually numbers throw an error.
    if (blockNumbers.some(item => isNaN(item))) {
      return callback(new Error('Some of the blocknumbers are invalid.'));
    }

    // Loop through each block and build an array of the promises.
    for (let i = 0, len = blockNumbers.length; i < len; i++) {
      requests.push(getBlockFromBlockchain(blockNumbers[i]));
    }

    // Wait for all the promises to resolve before calling the callback.
    Promise.all(requests).then((blocks) => {
      return callback(null, blocks);
    })
    .catch((error) => {
      return callback(error);
    });

  }

  /**
   * Save the block to Mongo.
   * 
   * @param {object} block 
   * @param {function} callback 
   */
  function saveBlock (block, callback) {

    // Connect to Mongo to first check if we already have this block.
    MongoClient.connect(config.MONGO, (error, database) => {

      var collection;

      if (error) {
        return callback(error);
      }

      // Select the blocks collection.
      collection = database.collection('blocks');

      // Insert the block into Mongo.
      collection.insertOne(block, (error) => {

        if (error) {
          return callback(error);
        }

        // Return the Fresh block.
        return callback(null, block);

      });

    });

  }

  /**
   * Get a list of blocks from the blockchain.
   */
  blocksRouter.route('/')
    .get((req, res) => {

      MongoClient.connect(config.MONGO, (error, db) => {

        var start = 1;
        var limit = 10;
        var missing = [];

        if (error) {
          return errors.handleResponse(res, error.message);
        }
  
        // Make sure the params are numbers.
        if (!isNaN(req.query.start)) {
          start = parseInt(req.query.start, 10);
        }

        if (!isNaN(req.query.limit)) {
          limit = parseInt(req.query.limit, 10);
        }

        // Update the specific dynamic global document in the meta collection.
        db.collection('blocks')
          .find({
            _id: {
              '$gte': start,
              '$lt': limit + start
            }
          })
          .toArray((error, blocks) => {
          
            if (error) {
              return errors.handleResponse(res, error.message);
            }
            
            // Loop through and validate that all the proper items are there, if not request them from the block chain.
            for (let i = start, end = limit + start; i < end; i++) {
              let block = blocks.find(item => item._id === i);

              // If the block isn't in the results then it is missing and we should retrieve it from the blockchain.
              if (!block) {
                missing.push(i);
              }

            }

            // Fetch the missing blocks from the blockchain, and update mongo.
            getBlocksFromBlockchain(missing, (error, blockchainBlocks) => {
              
              if (error) {
                return errors.handleResponse(res, error.message);
              }

              // Merge the new blocks with the cached blocks.
              blocks = blocks.concat(blockchainBlocks).sort((a, b) => a._id - b._id);

              return res.json(blocks);
            });

          });

      });

    });

  /**
   * Get a single block from the blockchain.
   */
  blocksRouter.route('/:id')
    .get((req, res) => {
  
      getBlock(req.params.id, (error, block) => {

        var statusCode = 500;

        // Handle the errors from getting the block.
        if (error) {

          // Check to see if we should return a 404 because the block wasn't found.
          if (error.message === BLOCK_NOT_FOUND) {
            statusCode = 404;
          }

          return errors.handleResponse(res, error.message, statusCode);
        }

        // Return the block as JSON.
        return res.json(block);

      });
  
    });

  /**
   * Get a single block's header from the blockchain.
   */
  blocksRouter.route('/:id/header')
  
    .get((req, res) => {

      // Request the full block, leverage MongoDB if we already have the block.
      getBlock(req.params.id, (error, block) => {

        if (error) {
          return errors.handleResponse(res, error.message);
        }

        // Strip out the properties that are not a part of the header, and put the rest in blockHeader.
        var { witness_signature, transactions, ...blockHeader } = block; //eslint-disable-line

        return res.json(blockHeader);

      });
  
    });

  return blocksRouter;

};
