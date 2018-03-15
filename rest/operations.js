const express = require('express');
const utils = require('../utils/objects');
const errors = require('../utils/errors');

/** http://docs.bitshares.org/api/database.html#objects */

module.exports = function (blockchainAPI) {

  var operationsRouter = express.Router({
    extendParams: true
  });

  // If the reference is missing the routes will not work, throw an error to alert the developers.
  if (!blockchainAPI) {
    throw new Error('Missing reference to the BlockChain API.');
  }

  /**
   * Get a single object from the blockchain.
   */
  operationsRouter.route('/:id')
    .get((req, res) => {

      // Make sure the id is valid before calling the api.
      if (!utils.isValidID(req.params.id)) {
        return errors.handleResponse(res, 'operations/:id requires a valid id to be passed.');
      }

      blockchainAPI.db_api()
        .exec('get_objects', [[req.params.id]])
        .then((operationObjects) => res.json(operationObjects[0]))
        .catch(error => errors.handleResponse(res, error.message));
  
    });

  return operationsRouter;

};
