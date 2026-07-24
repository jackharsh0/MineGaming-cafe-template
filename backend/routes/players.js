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
      'INSERT INTO players (name, phone, email, play_hours, loyalty_points, loyalty_tier) VALUES (?, ?, ?, 0.00, 0, "Bronze")',
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
        play_hours: 0.0,
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
      'SELECT id, name, phone, email, play_hours, loyalty_points, loyalty_tier FROM players WHERE id = ? AND is_blacklisted = 0',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player profile not found' });
    }

    res.json({ success: true, player: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Adjust Play Hours (Credit/Debit)
router.post('/:id/play-hours', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { amount, transactionType = 'credit', reason } = req.body;

  if (amount === undefined || isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid hours amount' });
  }

  try {
    const [players] = await pool.query('SELECT name, play_hours FROM players WHERE id = ?', [id]);
    if (players.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const player = players[0];
    let newBalance = parseFloat(player.play_hours);

    if (transactionType === 'debit') {
      if (newBalance < parseFloat(amount)) {
        return res.status(400).json({ success: false, message: `Insufficient balance. Available: ${newBalance.toFixed(2)} Hours` });
      }
      newBalance -= parseFloat(amount);
      await pool.query('UPDATE players SET play_hours = ? WHERE id = ?', [newBalance, id]);
      await logAudit(req.user.id, 'Play Hours Debit', `Deducted ${amount} hours from ${player.name}'s balance. Reason: ${reason || 'Not specified'} (New balance: ${newBalance.toFixed(2)} Hours)`);
    } else {
      newBalance += parseFloat(amount);
      await pool.query('UPDATE players SET play_hours = ? WHERE id = ?', [newBalance, id]);
      await logAudit(req.user.id, 'Play Hours Load', `Loaded ${amount} hours to ${player.name}'s balance (New balance: ${newBalance.toFixed(2)} Hours)`);
    }

    res.json({ success: true, message: 'Play hours adjusted successfully', newBalance });
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
    // Player info
    const [playerRows] = await pool.query('SELECT * FROM players WHERE id = ?', [id]);
    if (playerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Session history
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Player Profile (GDPR compliance)
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  try {
    const [players] = await pool.query('SELECT name, play_hours FROM players WHERE id = ?', [id]);
    if (players.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const player = players[0];
    
    // Delete player (Foreign Keys in game_sessions and pos_sales are set to ON DELETE SET NULL)
    await pool.query('DELETE FROM players WHERE id = ?', [id]);
    await logAudit(req.user.id, 'Player Delete', `Deleted player profile ${player.name} (Forfeited Play Hours: ${parseFloat(player.play_hours).toFixed(2)} Hours)`);

    res.json({ success: true, message: 'Player profile deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Manually adjust loyalty points & tier
router.post('/:id/loyalty', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  const { points } = req.body;

  if (points === undefined || isNaN(points) || parseInt(points) < 0) {
    return res.status(400).json({ success: false, message: 'Invalid points value' });
  }

  try {
    const [players] = await pool.query('SELECT name FROM players WHERE id = ?', [id]);
    if (players.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    const player = players[0];
    const ptsVal = parseInt(points);
    
    // Calculate new tier
    let newTier = 'Bronze';
    if (ptsVal >= 300) {
      newTier = 'Gold';
    } else if (ptsVal >= 100) {
      newTier = 'Silver';
    }

    await pool.query('UPDATE players SET loyalty_points = ?, loyalty_tier = ? WHERE id = ?', [ptsVal, newTier, id]);
    await logAudit(req.user.id, 'Loyalty Points Adjustment', `Manually adjusted ${player.name}'s loyalty points to ${ptsVal} PTS (Tier: ${newTier})`);

    res.json({ success: true, message: 'Loyalty points adjusted successfully', points: ptsVal, tier: newTier });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
