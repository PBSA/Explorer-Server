const ExplorerServer = require('../ExplorerServer');

var explorerServer = new ExplorerServer(false);

explorerServer.cleanDatabase(() => {
  console.log('ExplorerServer> Successfully cleaned database.');
});
