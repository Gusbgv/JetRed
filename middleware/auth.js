const jwt = require('jsonwebtoken');
const pool = require('../db');

// Middleware to verify token and attach user
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (!result.rows[0]) return res.status(403).json({ error: 'User not found' });

    req.user = result.rows[0]; // attach user to request
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Restrict to managers only
const requireManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Access denied: manager only' });
  }
  next();
};

module.exports = { authenticateToken, requireManager };
