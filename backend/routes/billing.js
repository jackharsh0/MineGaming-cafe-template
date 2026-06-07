const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit, getSystemSetting } = require('../utils/helper');
const { broadcast = null } = require('./realtime');
// Get current pricing rules
router.get('/rates', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pricing_rules');
    res.json({ success: true, rates: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update pricing rules (Admin/Manager only)
router.put('/rates', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { rates } = req.body; // Array of pricing rules: { station_type, hourly_rate, peak_hourly_rate, peak_start_time, peak_end_time, controller_addon_rate }

  if (!rates || !Array.isArray(rates)) {
    return res.status(400).json({ success: false, message: 'Invalid rates data' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const rule of rates) {
      await conn.query(
        `UPDATE pricing_rules 
         SET hourly_rate = ?, peak_hourly_rate = ?, peak_start_time = ?, peak_end_time = ?, controller_addon_rate = ? 
         WHERE station_type = ?`,
        [rule.hourly_rate, rule.hourly_rate, rule.peak_start_time || '18:00:00', rule.peak_end_time || '23:59:59', rule.controller_addon_rate, rule.station_type]
      );
    }

    await conn.commit();
    await logAudit(req.user.id, 'Rates Edit', 'Updated system-wide pricing rules');
    res.json({ success: true, message: 'Pricing rules updated successfully' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// Get Coupons list
router.get('/coupons', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coupons');
    res.json({ success: true, coupons: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add Coupon (Admin/Manager only)
router.post('/coupons', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { code, discount_percent, discount_flat, min_spend } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Coupon code is required' });
  }

  try {
    await pool.query(
      'INSERT INTO coupons (code, discount_percent, discount_flat, min_spend, active) VALUES (?, ?, ?, ?, 1)',
      [code.toUpperCase(), discount_percent || null, discount_flat || null, min_spend || 0.00]
    );

    await logAudit(req.user.id, 'Coupon Add', `Added coupon ${code}`);
    res.json({ success: true, message: 'Coupon added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: coupon code may already exist' });
  }
});

// Validate Coupon
router.get('/coupons/validate/:code', verifyToken, async (req, res) => {
  const { code } = req.params;
  const { subtotal } = req.query;

  try {
    const [rows] = await pool.query('SELECT * FROM coupons WHERE code = ? AND active = 1', [code.toUpperCase()]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    const coupon = rows[0];
    if (subtotal && parseFloat(subtotal) < parseFloat(coupon.min_spend)) {
      return res.status(400).json({
        success: false,
        message: `Minimum spend of $${coupon.min_spend} is required to use this coupon`
      });
    }

    res.json({ success: true, coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Calculate Active Session billing details for checkout modal preview
router.get('/checkout-preview/:sessionId', verifyToken, async (req, res) => {
  const { sessionId } = req.params;

  try {
    // 1. Get session info
    const [sessions] = await pool.query(
      `SELECT s.*, st.name AS station_name, st.type AS station_type, p.name AS player_name, p.loyalty_tier, p.wallet_balance
       FROM game_sessions s
       JOIN stations st ON s.station_id = st.id
       LEFT JOIN players p ON s.player_id = p.id
       WHERE s.id = ?`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessions[0];
    const now = new Date();
    
    let gameCost = parseFloat(session.total_cost);
    let elapsedMinutes = 0;

    if (session.status === 'Active' || session.status === 'Paused') {
      const startTime = new Date(session.start_time);
      const activeEndTime = session.status === 'Paused' ? new Date(session.pause_time) : now;
      const elapsedSeconds = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - session.paused_duration_seconds);
      elapsedMinutes = Math.ceil(elapsedSeconds / 60);

      if (session.session_type === 'Postpaid') {
        // Enforce 15 min minimum billing
        const billingSeconds = Math.max(900, elapsedSeconds);
        gameCost = parseFloat(((billingSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
      }
    } else {
      // Completed or Cancelled session
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time || session.start_time);
      const elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000) - session.paused_duration_seconds);
      elapsedMinutes = Math.ceil(elapsedSeconds / 60);
      gameCost = parseFloat(session.total_cost);
    }

    // 2. Fetch pending POS sales items
    const [posSales] = await pool.query(
      'SELECT id, total FROM pos_sales WHERE session_id = ? AND status = "Pending"',
      [sessionId]
    );

    const cafeCost = posSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    const subtotal = gameCost + cafeCost;
    const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
    const tax = parseFloat((subtotal * (taxPercent / 100)).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    res.json({
      success: true,
      session: {
        id: session.id,
        station_name: session.station_name,
        player_name: session.player_name || 'Walk-in',
        loyalty_tier: session.loyalty_tier || 'Bronze',
        wallet_balance: session.wallet_balance || 0.00,
        session_type: session.session_type,
        start_time: session.start_time,
        status: session.status,
        elapsed_minutes: elapsedMinutes
      },
      billing: {
        game_cost: gameCost,
        cafe_cost: cafeCost,
        subtotal,
        tax_rate: taxPercent,
        tax,
        total
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Confirm Session Checkout & Charge
router.post('/checkout/:sessionId', verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  const { paymentMethod, couponCode, walletSplitAmount, cashSplitAmount } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get session info
    const [sessions] = await conn.query(
      `SELECT s.*, st.id AS station_id, st.name AS station_name, p.id AS player_id, p.name AS player_name, p.loyalty_tier, p.wallet_balance
       FROM game_sessions s
       JOIN stations st ON s.station_id = st.id
       LEFT JOIN players p ON s.player_id = p.id
       WHERE s.id = ? AND s.status IN ('Active', 'Paused') FOR UPDATE`,
      [sessionId]
    );

    if (sessions.length === 0) {
      throw new Error('Active or paused session not found');
    }

    const session = sessions[0];
    const now = new Date();

    // Calculate game cost
    let gameCost = parseFloat(session.total_cost);
    let elapsedSeconds = 0;

    const startTime = new Date(session.start_time);
    const activeEndTime = session.status === 'Paused' ? new Date(session.pause_time) : now;
    elapsedSeconds = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - session.paused_duration_seconds);

    if (session.session_type === 'Postpaid') {
      const billingSeconds = Math.max(900, elapsedSeconds); // 15 min minimum
      gameCost = parseFloat(((billingSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
    }

    // Get pending POS sales
    const [posSales] = await conn.query(
      'SELECT id, total FROM pos_sales WHERE session_id = ? AND status = "Pending" FOR UPDATE',
      [sessionId]
    );

    const cafeCost = posSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    const subtotal = gameCost + cafeCost;

    // Apply Coupon
    let discount = 0.00;
    if (couponCode) {
      const [coupons] = await conn.query(
        'SELECT * FROM coupons WHERE code = ? AND active = 1',
        [couponCode.toUpperCase()]
      );
      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (subtotal >= parseFloat(coupon.min_spend)) {
          if (coupon.discount_percent) {
            discount = subtotal * (parseFloat(coupon.discount_percent) / 100);
          } else if (coupon.discount_flat) {
            discount = parseFloat(coupon.discount_flat);
          }
        }
      }
    }

    const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
    const tax = parseFloat(((subtotal - discount) * (taxPercent / 100)).toFixed(2));
    const total = parseFloat((subtotal - discount + tax).toFixed(2));

    // Handle wallet debits / checks
    if (paymentMethod === 'Wallet' && session.player_id) {
      if (parseFloat(session.wallet_balance) < total) {
        throw new Error(`Insufficient digital wallet balance. Available: $${session.wallet_balance}, Total: $${total}`);
      }
      // Deduct full amount
      await conn.query(
        'UPDATE players SET wallet_balance = wallet_balance - ? WHERE id = ?',
        [total, session.player_id]
      );
    } else if (paymentMethod === 'Split' && session.player_id) {
      const wAmount = parseFloat(walletSplitAmount || 0);
      const cAmount = parseFloat(cashSplitAmount || 0);
      if (wAmount + cAmount < total) {
        throw new Error(`Split payment total ($${wAmount + cAmount}) is less than total invoice amount ($${total})`);
      }
      if (parseFloat(session.wallet_balance) < wAmount) {
        throw new Error(`Insufficient wallet balance for split allocation. Available: $${session.wallet_balance}, Requested: $${wAmount}`);
      }
      // Deduct wallet split
      if (wAmount > 0) {
        await conn.query(
          'UPDATE players SET wallet_balance = wallet_balance - ? WHERE id = ?',
          [wAmount, session.player_id]
        );
      }
    }

    // 2. Mark session completed
    await conn.query(
      `UPDATE game_sessions 
       SET status = 'Completed', 
           end_time = CURRENT_TIMESTAMP, 
           total_cost = ?, 
           discount_applied = ?, 
           tax_applied = ?,
           payment_method = ?
       WHERE id = ?`,
      [total, discount, tax, paymentMethod, sessionId]
    );

    // 3. Mark pending POS items paid
    if (posSales.length > 0) {
      await conn.query(
        'UPDATE pos_sales SET status = "Paid" WHERE session_id = ? AND status = "Pending"',
        [sessionId]
      );
    }

    // 4. Set station status available
    await conn.query('UPDATE stations SET status = "Available" WHERE id = ?', [session.station_id]);

    // 5. Update Loyalty Engine
    if (session.player_id) {
      // Add points: 2 points per Rupee of game session cost
      const newPoints = Math.floor(gameCost * 2);
      
      // Update points
      await conn.query(
        'UPDATE players SET loyalty_points = loyalty_points + ? WHERE id = ?',
        [newPoints, session.player_id]
      );

      // Fetch updated points to calculate and adjust tier
      const [updatedPlayer] = await conn.query(
        'SELECT loyalty_points FROM players WHERE id = ?',
        [session.player_id]
      );
      const points = updatedPlayer[0].loyalty_points;
      
      let newTier = 'Bronze';
      if (points >= 300) {
        newTier = 'Gold';
      } else if (points >= 100) {
        newTier = 'Silver';
      }

      await conn.query(
        'UPDATE players SET loyalty_tier = ? WHERE id = ?',
        [newTier, session.player_id]
      );
    }

    await conn.commit();

    await logAudit(
      req.user.id,
      'Session Checkout',
      `Checked out Session ID: ${sessionId} on ${session.station_name}. Final payment: $${total.toFixed(2)} via ${paymentMethod}`
    );

    // Broadcast station available
    broadcast('station_update', { id: session.station_id, name: session.station_name, status: 'Available' });

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      receipt: {
        sessionId,
        stationName: session.station_name,
        playerName: session.player_name || 'Walk-in',
        sessionType: session.session_type,
        startTime: session.start_time,
        endTime: now,
        elapsedMinutes: Math.ceil(elapsedSeconds / 60),
        gameCost,
        cafeCost,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod
      }
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ success: false, message: err.message || 'Server error during checkout' });
  } finally {
    conn.release();
  }
});

// Get system configurations (taxes/discounts)
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM system_settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json({ success: true, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update system configurations (Admin/Manager only)
router.put('/settings', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid settings format' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const [key, val] of Object.entries(settings)) {
      await conn.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, val.toString(), val.toString()]
      );
    }

    await conn.commit();
    await logAudit(req.user.id, 'Settings Edit', 'Updated system billing and loyalty settings');
    res.json({ success: true, message: 'System settings updated successfully' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
