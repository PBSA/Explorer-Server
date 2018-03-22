module.exports = {
  isValidID: (id) => {
    var parts = id.split('.');
    
    // Each ID must consist of three parts.
    if (parts.length !== 3) {
      return false;
    }

    // Make sure each piece will proper parse into an integer
    return parts.every(piece => !isNaN(parseInt(piece, 10)));
  }
}
