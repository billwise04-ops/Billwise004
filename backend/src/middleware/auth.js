const jwt = require('jsonwebtoken');

// Protects routes: requires the header  Authorization: Bearer <token>
module.exports = function requireAuth(req, res, next) {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  try {
    req.officer = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
};
