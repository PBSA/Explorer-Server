/**
 * Return an error response.
 * 
 * @param {Response} res Express response object
 * @param {string} message Error message to return.
 * @param {code} code Response code to send. 
 * @returns 
 */
function handleResponse (res, message, code) {
  if (!code) {
    code = 500;
  }

  if (!message) {
    message = 'Invalid server request.';
  }
  
  return res.status(code).json({
    error: {
      message
    }
  });
}

module.exports = {
  handleResponse
}
