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
