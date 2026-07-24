const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');
const { validateBody, z } = require('../middleware/validate');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const customerLoginSchema = z.object({
  phone: z.string().trim().min(1, 'Phone is required'),
  password: z.string().min(1, 'Password is required')
});

const customerRegisterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().regex(/^\+?[0-9\s()-]{10,20}$/, 'Please provide a valid phone number (at least 10 digits)'),
  email: z.string().email('Please enter a valid email address').optional().nullable().or(z.literal('')),
  password: z.string().min(4, 'Password must be at least 4 characters long')
});

// Login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { username, password } = req.body;

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
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET environment variable is not set');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, full_name: admin.full_name },
      jwtSecret,
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
router.post('/customer/register', validateBody(customerRegisterSchema), async (req, res) => {
  const { name, phone, email, password } = req.body;
  const cleanPhone = phone.replace(/[\s()-]/g, '');

  try {
    // Check if phone number is already registered
    const [existing] = await pool.query('SELECT id, password_hash FROM players WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      const existingPlayer = existing[0];
      if (existingPlayer.password_hash) {
        return res.status(400).json({ success: false, message: 'A player with this phone number already exists' });
      }
      // It's a guest placeholder! Complete registration.
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      await pool.query(
        'UPDATE players SET name = ?, email = ?, password_hash = ? WHERE id = ?',
        [name, email || null, hash, existingPlayer.id]
      );
      return res.json({ success: true, message: 'Registration completed successfully! Your guest points and history are linked.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO players (name, phone, email, password_hash, play_hours, loyalty_points, loyalty_tier) 
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
router.post('/customer/login', validateBody(customerLoginSchema), async (req, res) => {
  const { phone, password } = req.body;

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
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET environment variable is not set');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    const token = jwt.sign(
      { id: player.id, name: player.name, phone: player.phone, role: 'Customer' },
      jwtSecret,
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
