const fs = require('fs');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const customCss = fs.readFileSync('assets/custom.css').toString();

// Middleware
const middleware = require('./middleware');

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

    // Configuration for the documentation page.
    var swaggerOptions = {
      customCss,
      customJs: '/assets/custom.js',
      customfavIcon: '/assets/pp_favicon.png',
      customSiteTitle: 'Peerplays'
    };

    // Apply the middleware on options requests.
    this.app.use(middleware.applyCorsHeaders);

    // Serve up static assets for the documentation page.
    this.app.use('/assets', express.static('assets'));

    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
    this.app.use('/api/accounts', accountsRouter(this.blockchainAPI));
    this.app.use('/api/blocks', blocksRouter(this.blockchainAPI));
    this.app.use('/api/objects', objectsRouter(this.blockchainAPI));
    this.app.use('/api/operations', operationsRouter(this.blockchainAPI));
    this.app.use('/api/witnesses', witnessesRouter(this.blockchainAPI));
  }

  /**
   * Callback for when the server is ready for incoming requests.
   */
  onServerReady () {
    console.log(`REST api listening on port ${this.port}`);
  }

}
