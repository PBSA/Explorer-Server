const http = require('http');
const io = require('socket.io');

class SocketServer {

  /**
   * Creates an instance of SocketServer.
   * @param {Express} application Express application.
   * @param {number} port Port to listen for socket connections on.
   * @memberof SocketServer
   */
  constructor (application, port) {
    
    // Default to port 3001 is a port is not passed.
    port = port || 3001;

    this.server = http.Server(application);
    this.io = io(this.server, {
      serveClient: false // Don't serve the client files.
    });

    // Setup the listeners for the various socket events.
    this.io.on('connection', this.clientConnected.bind(this));

    // Start listening for incoming socket connections.
    this.server.listen(port);
  }

  /**
   * Called when a new client connects. Will add them to the proper room to recieve new blocks.
   * 
   * @param {Socket} socket 
   * @memberof SocketServer
   */
  clientConnected (socket) {
    socket.join('blocks');
    socket.emit('connected');
  }

  /**
   * Called to broadcast the new block to all connected clients.
   * 
   * @param {any} block 
   * @memberof SocketServer
   */
  broadcastBlock (block) {
    this.io.in('blocks').emit('block-added', block);
  }

}

module.exports = SocketServer;
