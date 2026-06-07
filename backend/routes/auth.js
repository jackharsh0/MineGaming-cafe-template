const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');
require('dotenv').config();

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and Password required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users_admin WHERE username = ? AND status = "Active"', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, full_name: admin.full_name },
      process.env.JWT_SECRET || 'super_secret_cyber_neon_key_2026',
      { expiresIn: '12h' }
    );

    await logAudit(admin.id, 'Login', `${admin.full_name} logged in`);

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        full_name: admin.full_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current user details
router.get('/me', verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Customer Register
router.post('/customer/register', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Name, Phone, and Password are required' });
  }

  try {
    // Check if phone number is already registered
    const [existing] = await pool.query('SELECT id FROM players WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A player with this phone number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO players (name, phone, email, password_hash, wallet_balance, loyalty_points, loyalty_tier) 
       VALUES (?, ?, ?, ?, 0.00, 0, 'Bronze')`,
      [name, phone, email || null, hash]
    );

    res.json({ success: true, message: 'Customer registered successfully', playerId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Customer Login
router.post('/customer/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Phone and Password are required' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM players WHERE phone = ? AND is_blacklisted = 0', [phone]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or blacklisted account' });
    }

    const player = rows[0];
    
    // Check if player has a password set
    if (!player.password_hash) {
      return res.status(401).json({ success: false, message: 'Please register online first to set your account password' });
    }

    const isMatch = await bcrypt.compare(password, player.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT for customer
    const token = jwt.sign(
      { id: player.id, name: player.name, phone: player.phone, role: 'Customer' },
      process.env.JWT_SECRET || 'super_secret_cyber_neon_key_2026',
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: player.id,
        name: player.name,
        phone: player.phone,
        role: 'Customer'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
