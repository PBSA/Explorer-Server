
/**
 * Apply cors headers and send a 200 response on options requests.
 * 
 * @param {Request} req Express request object.
 * @param {Response} res Express response object.
 * @param {callback} next Callback to continue onto the next middleware / route handler.
 */
function applyCorsHeaders(req, res, next) {
  // Only respond with these headers on OPTIONS requests.
  if (req.method === 'OPTIONS') {  
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD');
    res.header('Access-Control-Allow-Headers', '*')
    res.send(200);
  } else {
    next();
  }
}

module.exports = {
  applyCorsHeaders
};
