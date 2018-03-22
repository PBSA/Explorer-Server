const ExplorerServer = require('./src/ExplorerServer');
const RestServer = require('./src/rest');
const SocketServer = require('./src/SocketServer');

var restServer; // eslint-disable-line
var socketServer; // eslint-disable-line

var explorerServer = new ExplorerServer((error) => {

  var port = process.env.REST_PORT || 3000;
  var socketPort = process.env.SOCKET_PORT || 3001;

  if (error) {
    return console.error(error);
  }

  // Start listening for new blocks from the block chain.
  explorerServer.start();

  // Create a new instance of the rest server.
  restServer = new RestServer(explorerServer.api, port);
  
  // Create a new socket server and pass a reference to the express server to reuse it.
  socketServer = new SocketServer(restServer.app, socketPort);

  // Pass a reference of the socket server to the explorer server so it can broadcast events about new blocks.
  explorerServer.socketServer = socketServer;

});

module.exports = explorerServer;
