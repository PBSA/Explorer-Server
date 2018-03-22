const express = require('express');
const utils = require('../utils/objects');
const errors = require('../utils/errors');

/** http://docs.bitshares.org/api/database.html#objects */

module.exports = function (blockchainAPI) {

  var objectsRouter = express.Router({
    extendParams: true
  });

  // If the reference is missing the routes will not work, throw an error to alert the developers.
  if (!blockchainAPI) {
    throw new Error('Missing reference to the BlockChain API.');
  }

  /**
   * Get a single object from the blockchain.
   */
  objectsRouter.route('/:id')
    .get((req, res) => {

      // Make sure the id is valid before calling the api.
      if (!utils.isValidID(req.params.id)) {
        return errors.handleResponse(res, 'objects/:id requires a valid id to be passed.');
      }

      blockchainAPI.db_api()
        .exec('get_objects', [[req.params.id]])
        .then(blockObjects => res.json(blockObjects[0]))
        .catch(error => errors.handleResponse(res, error.message));
  
    });

  return objectsRouter;

};
