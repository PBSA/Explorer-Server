const ExplorerServer = require('../ExplorerServer');

var explorerServer = new ExplorerServer((error) => {

  if (error) {
    return console.error(error);
  }

  explorerServer.populateAll(function (error) {

    if (error) {
      return console.error(error);
    }
  
    console.log('ExplorerServer> Successfully populated all blocks.');
  
  });

});
