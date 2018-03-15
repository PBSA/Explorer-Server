const express = require('express');
const utils = require('../utils/objects');
const errors = require('../utils/errors');

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
   * Get a single block from the blockchain.
   */
  blocksRouter.route('/:id')
    .get((req, res) => {

      // Make sure the id is valid before calling the api.
      if (!utils.isValidID(req.params.id)) {
        return errors.handleResponse(res, 'blocks/:id requires a valid id to be passed.');
      }

      blockchainAPI.db_api()
        .exec('get_block', [req.params.id])
        .then(block => res.json(block))
        .catch(error => errors.handleResponse(res, error.message));
  
    });

  /**
   * Get a single block's header from the blockchain.
   */
  blocksRouter.route('/:id/header')
    .get((req, res) => {

      // Make sure the id is valid before calling the api.
      if (!utils.isValidID(req.params.id)) {
        return errors.handleResponse(res, 'blocks/:id/header requires a valid id to be passed.');
      }

      blockchainAPI.db_api()
        .exec('get_block_header', [req.params.id])
        .then(block => res.json(block))
        .catch(error => errors.handleResponse(res, error.message));
  
    });

  return blocksRouter;

};
