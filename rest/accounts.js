const express = require('express');
const utils = require('../utils/objects');
const errors = require('../utils/errors');

/** http://docs.bitshares.org/api/database.html#accounts */

module.exports = function (blockchainAPI) {

  var accountsRouter = express.Router({
    extendParams: true
  });

  // If the reference is missing the routes will not work, throw an error to alert the developers.
  if (!blockchainAPI) {
    throw new Error('Missing reference to the BlockChain API.');
  }

  /**
   * Get a paginated list of accounts.
   */
  accountsRouter.route('/')
    .get((req, res) => {

      var start = 0;
      var limit = 100;

      // Make sure the query params are numbers
      if (!isNaN(req.query.start)) {
        start = parseInt(req.query.start, 10);
      }

      if (!isNaN(req.query.limit)) {
        limit = parseInt(req.query.limit, 10);
      }

      blockchainAPI.db_api()
        .exec('lookup_accounts', [start, limit])
        .then(accounts => res.json(accounts))
        .catch(error => errors.handleResponse(res, error.message));

    })
    /**
     * Get the total number of registerd accounts
     */
    .head((req, res) => {
      blockchainAPI.db_api()
      .exec('get_account_count', [])
      .then(count => res.set('X-Total-Count', count).end())
      .catch(() => res.status(500).end());
    });

  /**
   * Get a single object from the blockchain.
   */
  accountsRouter.route('/:id')
    .get((req, res) => {

      var action = 'get_accounts';
      var data = [req.params.id];

      // Support either an ID or a name being passed for looking up an account.
      if (!utils.isValidID(req.params.id)) {
        action = 'get_account_by_name';
        data = req.params.id;
      }

      blockchainAPI.db_api()
        .exec(action, [data])
        .then((accounts) => {
          
          var result = accounts;

          // Massage the result data based on the action we've used.
          if (Array.isArray(accounts)) {
            result = accounts[0];
          }
          
          // Return the first object that matches the query
          res.json(result);
        })
        .catch(error => errors.handleResponse(res, error.message));
  
    });

  /**
   * Get a single object from the blockchain.
   */
  accountsRouter.route('/:id/history')
    .get((req, res) => {
  
      // 1.11.0 is equal to zero in terms of transaction history.
      var start = req.query.start || '1.11.0';
      var most_recent = req.query.most_recent || '1.11.0';
      var limit = 100;

      // Make sure the max limit is always 100
      if (req.query.limit && req.query.limit < 100) {
        limit = req.query.limit;
      }

      // Make sure the id is valid before calling the api.
      if (!utils.isValidID(req.params.id)) {
        return errors.handleResponse(res, 'accounts/:id/history/ requires a valid id to be passed.');
      }

      blockchainAPI.history_api()
        .exec('get_account_history', [req.params.id, start, limit, most_recent])
        .then(accountHistory => res.json(accountHistory))
        .catch(error => errors.handleResponse(res, error.message));
    
    });

  /**
   * Get a single object from the blockchain.
   */
  accountsRouter.route('/:id/balances')
    .get((req, res) => {

      var assets = [];
      var action = 'get_account_balances';
      
      if (req.query.assets) {
        assets = req.query.assets.split(',');
      }

      // Support being passes an account name instead of an id.
      if (!utils.isValidID(req.params.id)) {
        action = 'get_named_account_balances';
      }

      blockchainAPI.db_api()
        .exec(action, [req.params.id, assets])
        .then(accountBalances => res.json(accountBalances))
        .catch(error => errors.handleResponse(res, error.message));
    
    });
    
  return accountsRouter;

};
