const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Fallback to query parameter token (used for file downloads)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_cyber_neon_key_2026');
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

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_cyber_neon_key_2026');
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
