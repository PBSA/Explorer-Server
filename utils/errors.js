module.exports = {
  handleResponse: (res, message) => {
    
    if (!message) {
      message = 'Invalid server request.';
    }
    
    return res.status(500).json({
      error: {
        message
      }
    });
  }
}
