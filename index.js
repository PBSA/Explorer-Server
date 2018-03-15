const ExplorerServer = require('./ExplorerServer');
const RestServer = require('./rest');

var restServer; // eslint-disable-line

var explorerServer = new ExplorerServer((error) => {

  var port = process.env.REST_PORT || 3000;

  if (error) {
    return console.error(error);
  }

  explorerServer.start();

  restServer = new RestServer(explorerServer.api, port);

});

module.exports = explorerServer;
