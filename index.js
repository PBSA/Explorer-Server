const ExplorerServer = require('./ExplorerServer');

var explorerServer = new ExplorerServer((error) => {
  
  if (error) {
    return console.error(error);
  }
  
  explorerServer.start()
});

module.exports = explorerServer;
