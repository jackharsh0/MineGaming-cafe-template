const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');

// Get all administrative user accounts (SuperAdmin only)
router.get('/', verifyToken, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, full_name, role, status, created_at FROM users_admin ORDER BY created_at DESC');
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new user account (SuperAdmin only)
router.post('/', verifyToken, requireRole(['SuperAdmin']), async (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  // Ensure role is valid
  if (!['SuperAdmin', 'Manager', 'Attendant'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role assignment' });
  }

  try {
    // Check if username is already taken
    const [existing] = await pool.query('SELECT id FROM users_admin WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO users_admin (username, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, "Active")',
      [username, hash, full_name, role]
    );

    await logAudit(req.user.id, 'User Create', `Created new administrative account: ${username} (${role})`);

    res.json({ success: true, message: 'User account created successfully', userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user details (SuperAdmin only)
router.put('/:id', verifyToken, requireRole(['SuperAdmin']), async (req, res) => {
  const { id } = req.params;
  const { username, password, full_name, role } = req.body;

  if (!username || !full_name || !role) {
    return res.status(400).json({ success: false, message: 'Username, Full Name, and Role are required' });
  }

  // Ensure role is valid
  if (!['SuperAdmin', 'Manager', 'Attendant'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role assignment' });
  }

  try {
    // Check username conflict
    const [existing] = await pool.query('SELECT id FROM users_admin WHERE username = ? AND id != ?', [username, id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    if (password) {
      // Update with password
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      await pool.query(
        'UPDATE users_admin SET username = ?, password_hash = ?, full_name = ?, role = ? WHERE id = ?',
        [username, hash, full_name, role, id]
      );
    } else {
      // Update without password
      await pool.query(
        'UPDATE users_admin SET username = ?, full_name = ?, role = ? WHERE id = ?',
        [username, full_name, role, id]
      );
    }

    await logAudit(req.user.id, 'User Update', `Updated account: ${username} (${role})`);

    res.json({ success: true, message: 'User account updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle status (SuperAdmin only)
router.patch('/:id/status', verifyToken, requireRole(['SuperAdmin']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  // Prevent self-deactivation
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'Self-deactivation is not permitted' });
  }

  try {
    const [userRows] = await pool.query('SELECT username FROM users_admin WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await pool.query('UPDATE users_admin SET status = ? WHERE id = ?', [status, id]);
    await logAudit(req.user.id, 'User Status Toggle', `Toggled user ID ${id} status to ${status}`);

    res.json({ success: true, message: `User status set to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user account (SuperAdmin only)
router.delete('/:id', verifyToken, requireRole(['SuperAdmin']), async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'Self-deletion is not permitted' });
  }

  // Default admin ID to reassign historical records to
  const defaultAdminId = 1;

  try {
    const [userRows] = await pool.query('SELECT username FROM users_admin WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const username = userRows[0].username;

    // Reassign sessions
    await pool.query('UPDATE game_sessions SET created_by = ? WHERE created_by = ?', [defaultAdminId, id]);

    // Reassign POS sales
    await pool.query('UPDATE pos_sales SET created_by = ? WHERE created_by = ?', [defaultAdminId, id]);

    // Delete audit logs
    await pool.query('DELETE FROM audit_logs WHERE user_id = ?', [id]);

    // Delete user account
    await pool.query('DELETE FROM users_admin WHERE id = ?', [id]);

    await logAudit(req.user.id, 'User Delete', `Completely deleted user account: ${username}`);

    res.json({ success: true, message: `Account '${username}' has been completely deleted.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
