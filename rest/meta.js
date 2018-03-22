const express = require('express');
const MongoClient = require('mongodb');
const errors = require('../utils/errors');

const config = require('../config');

module.exports = function () {

  var metaRouter = express.Router({
    extendParams: true
  });

  metaRouter.route('/dynamic-global')
    .get((req, res) => {

      MongoClient.connect(config.MONGO, (error, db) => {

        if (error) {
          return errors.handleResponse(res, error.message);
        }

        // Retrieve the cached dynamic global which will have the latest block number on it.
        db.collection('meta').findOne({_id: '2.1.0'}, (error, block) => {

          if (error) {
            return errors.handleResponse(res, error.message);
          }

          // Delete the duplicate id property.
          delete block._id;

          res.json(block);
        });

      });

    });

  return metaRouter;

}
