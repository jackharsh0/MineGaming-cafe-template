const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot authenticate requests.');
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'Server authentication not configured' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
  }
};

const verifyTokenOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  if (!JWT_SECRET) {
    return next();
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient Permissions' });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  verifyTokenOptional,
  requireRole
};
