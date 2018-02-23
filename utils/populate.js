const ExplorerServer = require('../ExplorerServer');

var explorerServer = new ExplorerServer((error) => {

  if (error) {
    return console.error(error);
  }

  explorerServer.populate(function (error) {

    if (error) {
      return console.error(error);
    }
  
    console.log('ExplorerServer> Successfully populated collections.');
  
  });

});
