const express = require('express');

// Routes
const accountsRouter = require('./accounts');
const blocksRouter = require('./blocks');
const objectsRouter = require('./objects');
const operationsRouter = require('./operations');
const witnessesRouter = require('./witnesses');

module.exports = class RestServer {

  constructor (blockchainAPI, port) {
    
    // Default to port 3000 if one is not provided.
    if (!port) {
      port = 3000;
    }

    // Store a reference on the instance.
    this.port = port;

    // Create the express application;
    this.app = express();
    
    // A reference to the already connect websocket.
    this.blockchainAPI = blockchainAPI;

    // Add each of the resource routes, and pass them a reference to the open connection
    this.attachRoutes();

    // Listen on the provided port.
    this.app.listen(this.port, this.onServerReady.bind(this));
  }

  /**
   * Attach each of the routers to their respective urls.
   */
  attachRoutes () {
    this.app.use('/accounts', accountsRouter(this.blockchainAPI));
    this.app.use('/blocks', blocksRouter(this.blockchainAPI));
    this.app.use('/objects', objectsRouter(this.blockchainAPI));
    this.app.use('/operations', operationsRouter(this.blockchainAPI));
    this.app.use('/witnesses', witnessesRouter(this.blockchainAPI));
  }

  /**
   * Callback for when the server is ready for incoming requests.
   */
  onServerReady () {
    console.log(`REST api listening on port ${this.port}`);
  }

}
