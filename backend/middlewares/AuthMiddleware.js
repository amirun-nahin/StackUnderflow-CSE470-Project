const jwt = require('jsonwebtoken');

const validateToken = (req, res, next) => {
  // The token is usually sent in the headers as "Bearer <token>"
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ error: 'User not logged in. No token provided.' });
  }

  // Split "Bearer [token]" and just grab the token part
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using your secret key
    // 'fallback_secret' is added as backup key for simplifying the process in case of failure
    const validToken = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Attach the decoded user data to the request so other routes can use it
    req.user = validToken; 
    
    // Move on to the actual route
    return next(); 
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = { validateToken };