const express = require('express');
const utils = require('../utils/objects');
const errors = require('../utils/errors');

/** http://docs.bitshares.org/api/database.html#witnesses **/

module.exports = function (blockchainAPI) {

  var witnesssesRouter = express.Router({
    extendParams: true
  });

  // If the reference is missing the routes will not work, throw an error to alert the developers.
  if (!blockchainAPI) {
    throw new Error('Missing reference to the BlockChain API.');
  }

  /**
   * Get a list of all the witnesses with the ability to filter by name.
   */
  witnesssesRouter.route('/')
    .get((req, res) => {

      var startingName = '';
      var limit = 1000;

      // Override the defaults if they are passed on the query string.
      if (req.query.starting_name) {
        startingName = req.query.starting_name;
      }

      // Make sure the limit does not exceed 1000
      if (req.query.limit && req.query.limit < 1000) {
        limit = req.query.limit;
      }

      blockchainAPI.db_api()
        .exec('lookup_witness_accounts', [startingName, limit])
        .then(witnessObjects => res.json(witnessObjects))
        .catch(error => errors.handleResponse(res, error.message));
  
    })
    /**
     * Get a count of registered witnesses
     */
    .head((req, res) => {
      blockchainAPI.db_api()
      .exec('get_witness_count', [])
      .then(count => res.set('X-Total-Count', count).res.end())
      .catch((error) => {
        // Print the error to the logs since we can't return it in the response.
        console.error(error);
        res.status(500).end()
      });
    });

  /**
   * Get a single witness.
   */
  witnesssesRouter.route('/:id')
    .get((req, res) => {
      
      // Make sure the id is valid before calling the api.
      if (!utils.isValidID(req.params.id)) {
        return errors.handleResponse(res, 'witnesses/:id requires a valid id to be passed.');
      }

      blockchainAPI.db_api()
        .exec('get_witnesses', [[req.params.id]])
        .then(witnessObjects => res.json(witnessObjects[0]))
        .catch(error => errors.handleResponse(res, error.message));

    });

  return witnesssesRouter;

};
