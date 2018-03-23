const ExplorerServer = require('../ExplorerServer');

var explorerServer = new ExplorerServer(false);

explorerServer.createCollections((error) => {

  if (error) {
    return console.error(error);
  }

  console.log('ExplorerServer> Successfully created collections.');

});
