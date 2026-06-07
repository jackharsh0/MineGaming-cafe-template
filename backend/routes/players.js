const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');

// Get all players
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM players ORDER BY name');
    res.json({ success: true, players: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search players by phone or name
router.get('/search', verifyToken, async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.json({ success: true, players: [] });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM players WHERE name LIKE ? OR phone LIKE ? LIMIT 10',
      [`%${query}%`, `%${query}%`]
    );
    res.json({ success: true, players: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Register Player
router.post('/', verifyToken, async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone number are required' });
  }

  try {
    // Check if phone already registered
    const [exists] = await pool.query('SELECT id FROM players WHERE phone = ?', [phone]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const [result] = await pool.query(
      'INSERT INTO players (name, phone, email, wallet_balance, loyalty_points, loyalty_tier) VALUES (?, ?, ?, 0.00, 0, "Bronze")',
      [name, phone, email || null]
    );

    await logAudit(req.user.id, 'Player Register', `Registered player ${name} (${phone})`);
    res.json({
      success: true,
      message: 'Player registered successfully',
      player: {
        id: result.insertId,
        name,
        phone,
        email,
        wallet_balance: 0.0,
        loyalty_points: 0,
        loyalty_tier: 'Bronze',
        is_blacklisted: 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Customer profile endpoints
router.get('/profile/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Customer') {
      return res.status(403).json({ success: false, message: 'Access denied: Customers only' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, phone, email, wallet_balance, loyalty_points, loyalty_tier FROM players WHERE id = ? AND is_blacklisted = 0',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player profile not found' });
    }

    res.json({ success: true, player: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get current logged-in customer session & transaction history
router.get('/profile/history', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Customer') {
      return res.status(400).json({ success: false, message: 'Only customers can access this history endpoint' });
    }

    const playerId = req.user.id;

    const [sessions] = await pool.query(
      `SELECT s.id, st.name AS station_name, st.type AS station_type, s.session_type, 
              s.start_time, s.end_time, s.total_cost, s.status, s.hourly_rate
       FROM game_sessions s
       JOIN stations st ON s.station_id = st.id
       WHERE s.player_id = ?
       ORDER BY s.start_time DESC LIMIT 20`,
      [playerId]
    );

    const [sales] = await pool.query(
      `SELECT id, sale_type, subtotal, tax, discount, total, payment_method, status, created_at 
       FROM pos_sales 
       WHERE player_id = ? 
       ORDER BY created_at DESC LIMIT 20`,
      [playerId]
    );

    res.json({
      success: true,
      sessions,
      transactions: sales
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Load Wallet
router.post('/:id/wallet', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (amount === undefined || isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid load amount' });
  }

  try {
    const [players] = await pool.query('SELECT name, wallet_balance FROM players WHERE id = ?', [id]);
    if (players.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const player = players[0];
    const newBalance = parseFloat(player.wallet_balance) + parseFloat(amount);

    await pool.query('UPDATE players SET wallet_balance = ? WHERE id = ?', [newBalance, id]);
    await logAudit(req.user.id, 'Wallet Load', `Loaded $${amount} to ${player.name}'s wallet (New balance: $${newBalance.toFixed(2)})`);

    res.json({ success: true, message: 'Wallet balance loaded successfully', newBalance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle Blacklist Status
router.patch('/:id/blacklist', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  const { is_blacklisted, blacklist_notes } = req.body;

  try {
    const [players] = await pool.query('SELECT name FROM players WHERE id = ?', [id]);
    if (players.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    await pool.query(
      'UPDATE players SET is_blacklisted = ?, blacklist_notes = ? WHERE id = ?',
      [is_blacklisted ? 1 : 0, blacklist_notes || null, id]
    );

    const actionText = is_blacklisted ? 'Blacklisted' : 'Un-blacklisted';
    await logAudit(req.user.id, 'Player Blacklist Toggle', `${actionText} player ${players[0].name}. Notes: ${blacklist_notes || 'None'}`);

    res.json({ success: true, message: `Player has been successfully ${actionText.toLowerCase()}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get Player Play History & Details
router.get('/:id/history', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get player info
    const [playerRows] = await pool.query('SELECT * FROM players WHERE id = ?', [id]);
    if (playerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // 2. Get session history
    const [sessions] = await pool.query(
      `SELECT s.id, st.name AS station_name, s.session_type, s.start_time, s.end_time, s.total_cost, s.status
       FROM game_sessions s
       JOIN stations st ON s.station_id = st.id
       WHERE s.player_id = ?
       ORDER BY s.start_time DESC LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      player: playerRows[0],
      history: sessions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
