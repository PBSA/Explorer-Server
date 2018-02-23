const ExplorerServer = require('./ExplorerServer');

var explorerServer = new ExplorerServer(() => explorerServer.start());

module.exports = explorerServer;
