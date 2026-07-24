const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit, getSystemSetting } = require('../utils/helper');
const { broadcast = null } = require('./realtime');
const { validateBody, z } = require('../middleware/validate');
const { handleError } = require('../utils/error');

const billingCheckoutSchema = z.object({
  paymentMethod: z.enum(['Cash', 'PlayHours', 'Card', 'Split']),
  couponCode: z.string().trim().nullable().optional(),
  walletSplitAmount: z.number().nonnegative().optional(),
  playHoursSplitAmount: z.number().nonnegative().optional(),
  cashSplitAmount: z.number().nonnegative().optional(),
  customerPhone: z.string().trim().nullable().optional(),
  paymentIntentId: z.string().trim().nullable().optional(),
  transactionId: z.string().trim().nullable().optional()
});
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
  const { rates } = req.body; // Array of pricing rules: { station_type, hourly_rate, controller_addon_rate }

  if (!rates || !Array.isArray(rates)) {
    return res.status(400).json({ success: false, message: 'Invalid rates data' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const rule of rates) {
      await conn.query(
        `UPDATE pricing_rules 
         SET hourly_rate = ?, controller_addon_rate = ? 
         WHERE station_type = ?`,
        [rule.hourly_rate, rule.controller_addon_rate, rule.station_type]
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
        message: `Minimum spend of ₹${coupon.min_spend} is required to use this coupon`
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
      `SELECT s.*, st.name AS station_name, st.type AS station_type, p.id AS player_id, p.name AS player_name, p.phone AS player_phone, p.loyalty_tier, p.play_hours
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
    const now = pool.getDbNow();
    
    let gameCost = parseFloat(session.total_cost);
    let elapsedMinutes = 0;
    let billedMinutes = 0;

    if (session.status === 'Active' || session.status === 'Paused') {
      const startTime = new Date(session.start_time);
      
      if (session.target_end_time) {
        const targetEndTime = new Date(session.target_end_time);
        const totalPurchasedSeconds = Math.max(0, Math.floor((targetEndTime - startTime) / 1000) - session.paused_duration_seconds);
        elapsedMinutes = Math.ceil(totalPurchasedSeconds / 60);
        billedMinutes = elapsedMinutes;
        
        if (session.session_type === 'Postpaid') {
          gameCost = parseFloat(((totalPurchasedSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
        }
      } else {
        const activeEndTime = session.status === 'Paused' ? new Date(session.pause_time) : now;
        const elapsedSeconds = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - session.paused_duration_seconds);
        elapsedMinutes = Math.ceil(elapsedSeconds / 60);

        if (session.session_type === 'Postpaid') {
          // Enforce 15 min minimum billing
          const billingSeconds = Math.max(900, elapsedSeconds);
          gameCost = parseFloat(((billingSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
          billedMinutes = Math.ceil(billingSeconds / 60);
        } else {
          billedMinutes = elapsedMinutes;
        }
      }
    } else {
      // Completed or Cancelled session
      const startTime = new Date(session.start_time);
      if (session.target_end_time) {
        const targetEndTime = new Date(session.target_end_time);
        const totalPurchasedSeconds = Math.max(0, Math.floor((targetEndTime - startTime) / 1000) - session.paused_duration_seconds);
        elapsedMinutes = Math.ceil(totalPurchasedSeconds / 60);
        billedMinutes = elapsedMinutes;
        
        if (session.session_type === 'Postpaid') {
          gameCost = parseFloat(((totalPurchasedSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
        }
      } else {
        const endTime = new Date(session.end_time || session.start_time);
        const elapsedSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000) - session.paused_duration_seconds);
        elapsedMinutes = Math.ceil(elapsedSeconds / 60);
        
        if (session.session_type === 'Postpaid') {
          const billingSeconds = Math.max(900, elapsedSeconds);
          billedMinutes = Math.ceil(billingSeconds / 60);
        } else {
          billedMinutes = elapsedMinutes;
        }
      }
      gameCost = parseFloat(session.total_cost);
    }

    // 2. Fetch pending POS sales items
    const [posSales] = await pool.query(
      'SELECT id, total FROM pos_sales WHERE session_id = ? AND status = "Pending"',
      [sessionId]
    );

    const cafeCost = posSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
    
    // Both gameCost and cafeCost are tax-inclusive
    const total = parseFloat((gameCost + cafeCost).toFixed(2));
    const subtotal = parseFloat((total / (1 + (taxPercent / 100))).toFixed(2));
    const tax = parseFloat((total - subtotal).toFixed(2));

    res.json({
      success: true,
      session: {
        id: session.id,
        station_name: session.station_name,
        player_id: session.player_id,
        player_name: session.player_name || 'Walk-in',
        player_phone: session.player_phone || '',
        loyalty_tier: session.loyalty_tier || 'Bronze',
        play_hours: session.play_hours || 0.00,
        session_type: session.session_type,
        start_time: session.start_time,
        status: session.status,
        elapsed_minutes: elapsedMinutes,
        billed_minutes: billedMinutes
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
router.post('/checkout/:sessionId', verifyToken, validateBody(billingCheckoutSchema), async (req, res) => {
  const { sessionId } = req.params;
  const { paymentMethod, couponCode, walletSplitAmount, playHoursSplitAmount, cashSplitAmount, customerPhone, paymentIntentId, transactionId } = req.body;

  // Idempotency check:
  if (transactionId) {
    try {
      const [existingSession] = await pool.query(
        'SELECT id FROM game_sessions WHERE transaction_id = ?',
        [transactionId]
      );
      if (existingSession.length > 0) {
        return res.json({
          success: true,
          message: 'Session checkout already completed successfully (idempotent)'
        });
      }
    } catch (dbErr) {
      console.error('Idempotency check failed:', dbErr);
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get session info
    const [sessions] = await conn.query(
      `SELECT s.*, st.id AS station_id, st.name AS station_name, p.id AS player_id, p.name AS player_name, p.phone AS player_phone, p.loyalty_tier, p.play_hours
       FROM game_sessions s
       JOIN stations st ON s.station_id = st.id
       LEFT JOIN players p ON s.player_id = p.id
       WHERE s.id = ? AND s.status IN ('Active', 'Paused') FOR UPDATE`,
      [sessionId]
    );

    if (sessions.length === 0) {
      const [compSess] = await conn.query('SELECT status FROM game_sessions WHERE id = ?', [sessionId]);
      if (compSess.length > 0 && compSess[0].status === 'Completed') {
        await conn.commit();
        conn.release();
        return res.json({
          success: true,
          message: 'Session checkout already completed (idempotent)'
        });
      }
      throw new Error('Active or paused session not found');
    }

    const session = sessions[0];
    const now = pool.getDbNow();

    // Link optional phone number if session has no player
    let linkedPlayerId = session.player_id;
    if (!linkedPlayerId && customerPhone && customerPhone.trim()) {
      const phoneClean = customerPhone.trim();
      const [existing] = await conn.query('SELECT id, name, loyalty_tier, play_hours FROM players WHERE phone = ?', [phoneClean]);
      if (existing.length > 0) {
        linkedPlayerId = existing[0].id;
        await conn.query('UPDATE game_sessions SET player_id = ? WHERE id = ?', [linkedPlayerId, sessionId]);
        session.player_id = linkedPlayerId;
        session.player_name = existing[0].name;
        session.loyalty_tier = existing[0].loyalty_tier;
        session.play_hours = existing[0].play_hours;
      } else {
        const [insertRes] = await conn.query(
          "INSERT INTO players (name, phone, play_hours, loyalty_points, loyalty_tier) VALUES ('Guest', ?, 0.00, 0, 'Bronze')",
          [phoneClean]
        );
        linkedPlayerId = insertRes.insertId;
        await conn.query('UPDATE game_sessions SET player_id = ? WHERE id = ?', [linkedPlayerId, sessionId]);
        session.player_id = linkedPlayerId;
        session.player_name = 'Guest';
        session.loyalty_tier = 'Bronze';
        session.play_hours = 0.00;
      }
    }

    // Calculate game cost
    let gameCost = parseFloat(session.total_cost);
    let elapsedSeconds = 0;

    const startTime = new Date(session.start_time);
    const activeEndTime = session.status === 'Paused' ? new Date(session.pause_time) : now;
    elapsedSeconds = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - session.paused_duration_seconds);

    if (session.target_end_time) {
      const targetEndTime = new Date(session.target_end_time);
      const totalPurchasedSeconds = Math.max(0, Math.floor((targetEndTime - startTime) / 1000) - session.paused_duration_seconds);
      
      if (session.session_type === 'Postpaid') {
        gameCost = parseFloat(((totalPurchasedSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
      }
    } else {
      if (session.session_type === 'Postpaid') {
        const billingSeconds = Math.max(900, elapsedSeconds); // 15 min minimum
        gameCost = parseFloat(((billingSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
      }
    }

    // Get pending POS sales
    const [posSales] = await conn.query(
      'SELECT id, total FROM pos_sales WHERE session_id = ? AND status = "Pending" FOR UPDATE',
      [sessionId]
    );

    const cafeCost = posSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
    const baseTotal = gameCost + cafeCost;

    // Apply Coupon
    let discount = 0.00;
    if (couponCode) {
      const [coupons] = await conn.query(
        'SELECT * FROM coupons WHERE code = ? AND active = 1',
        [couponCode.toUpperCase()]
      );
      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (baseTotal >= parseFloat(coupon.min_spend)) {
          if (coupon.discount_percent) {
            discount = baseTotal * (parseFloat(coupon.discount_percent) / 100);
          } else if (coupon.discount_flat) {
            discount = parseFloat(coupon.discount_flat);
          }
        }
      }
    }

    const total = parseFloat((baseTotal - discount).toFixed(2));
    const subtotal = parseFloat((total / (1 + (taxPercent / 100))).toFixed(2));
    const tax = parseFloat((total - subtotal).toFixed(2));

    let hoursToDeduct = 0.00;
    // Handle play hours debits / checks
    if (paymentMethod === 'PlayHours' && session.player_id) {
      const hourlyRate = parseFloat(session.hourly_rate) > 0 ? parseFloat(session.hourly_rate) : 5.00;
      hoursToDeduct = parseFloat((total / hourlyRate).toFixed(2));
      if (parseFloat(session.play_hours) < hoursToDeduct) {
        throw new Error(`Insufficient play hours balance. Available: ${session.play_hours} Hours, Total Required: ${hoursToDeduct} Hours (cost: ₹${total})`);
      }
      // Deduct full amount in hours
      await conn.query(
        'UPDATE players SET play_hours = play_hours - ? WHERE id = ?',
        [hoursToDeduct, session.player_id]
      );
    } else if (paymentMethod === 'Split' && session.player_id) {
      const wAmount = parseFloat(playHoursSplitAmount || walletSplitAmount || 0); // hours
      const cAmount = parseFloat(cashSplitAmount || 0); // cash
      const hourlyRate = parseFloat(session.hourly_rate) > 0 ? parseFloat(session.hourly_rate) : 5.00;
      const cashEquivalent = parseFloat((wAmount * hourlyRate).toFixed(2));
      if (cashEquivalent + cAmount < total) {
        throw new Error(`Split payment total (equivalent to ₹${(cashEquivalent + cAmount).toFixed(2)}) is less than total invoice amount (₹${total})`);
      }
      if (parseFloat(session.play_hours) < wAmount) {
        throw new Error(`Insufficient play hours balance for split allocation. Available: ${session.play_hours} Hours, Requested: ${wAmount} Hours`);
      }
      // Deduct play hours split
      if (wAmount > 0) {
        await conn.query(
          'UPDATE players SET play_hours = play_hours - ? WHERE id = ?',
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
           payment_method = ?,
           payment_intent_id = ?,
           transaction_id = ?
       WHERE id = ?`,
      [total, discount, tax, paymentMethod, paymentIntentId || null, transactionId || null, sessionId]
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
      `Checked out Session ID: ${sessionId} on ${session.station_name}. Final payment: ₹${total.toFixed(2)} via ${paymentMethod}`
    );

    // Send WhatsApp Bill asynchronously if enabled
    try {
      const [settingsRows] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'whatsapp_enabled'");
      const whatsappEnabled = settingsRows.length > 0 ? settingsRows[0].setting_value === '1' : false;
      const targetPhone = customerPhone || session.player_phone;
      if (whatsappEnabled && targetPhone && targetPhone.trim()) {
        // Query cafe items for this session
        const [itemsRows] = await pool.query(
          `SELECT i.name, psi.quantity, psi.total_price 
           FROM pos_sale_items psi
           JOIN pos_sales ps ON psi.sale_id = ps.id
           JOIN inventory i ON psi.item_id = i.id
           WHERE ps.session_id = ?`,
          [sessionId]
        );

        const invoiceItems = [
          { name: `Game Play (${session.session_type})`, quantity: `${Math.ceil(elapsedSeconds / 60)} min`, totalPrice: gameCost }
        ];
        itemsRows.forEach(row => {
          invoiceItems.push({ name: row.name, quantity: row.quantity, totalPrice: parseFloat(row.total_price) });
        });

        const { sendWhatsAppInvoice } = require('../utils/whatsapp');
        sendWhatsAppInvoice(targetPhone.trim(), {
          receiptId: sessionId,
          customerName: session.player_name || 'Walk-in',
          stationName: session.station_name,
          subtotal,
          discount,
          tax,
          taxRate: taxPercent,
          total,
          items: invoiceItems
        }).catch(e => {
          console.error('[WhatsApp Bill Error] Failed to send receipt PDF:', e.message);
        });
      }
    } catch (wsErr) {
      console.error('[WhatsApp Bill Error] Settings or items query failed:', wsErr.message);
    }

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
    handleError(res, err, 'Server error during checkout');
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

// GET /active-sessions — returns all active terminal & dining sessions for merge dropdowns
router.get('/active-sessions', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT gs.id, gs.station_id, gs.player_id, gs.session_type, gs.status,
             gs.start_time, gs.hourly_rate, gs.total_cost, gs.paused_duration_seconds,
             gs.pause_time, gs.target_end_time,
             st.name AS station_name, st.type AS station_type,
             p.name AS player_name
      FROM game_sessions gs
      JOIN stations st ON gs.station_id = st.id
      LEFT JOIN players p ON gs.player_id = p.id
      WHERE gs.status IN ('Active', 'Paused')
      ORDER BY gs.start_time ASC
    `);

    const now = pool.getDbNow();
    const terminals = [];
    const tables = [];

    rows.forEach(sess => {
      const startTime = new Date(sess.start_time);
      const activeEndTime = sess.status === 'Paused' ? new Date(sess.pause_time) : now;
      const pausedSecs = parseInt(sess.paused_duration_seconds || 0, 10);
      const elapsedSeconds = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - pausedSecs);
      const elapsedMinutes = Math.ceil(elapsedSeconds / 60);

      let gameCost = parseFloat(sess.total_cost || 0);
      if (sess.session_type === 'Postpaid') {
        if (sess.target_end_time) {
          const targetEnd = new Date(sess.target_end_time);
          const totalPurchSecs = Math.max(0, Math.floor((targetEnd - startTime) / 1000) - pausedSecs);
          gameCost = parseFloat(((totalPurchSecs / 3600) * parseFloat(sess.hourly_rate)).toFixed(2));
        } else {
          const billSecs = Math.max(900, elapsedSeconds);
          gameCost = parseFloat(((billSecs / 3600) * parseFloat(sess.hourly_rate)).toFixed(2));
        }
      }

      const entry = {
        id: sess.id,
        station_id: sess.station_id,
        station_name: sess.station_name,
        station_type: sess.station_type,
        player_name: sess.player_name || 'Walk-in',
        session_type: sess.session_type,
        status: sess.status,
        elapsed_minutes: elapsedMinutes,
        game_cost: gameCost
      };

      if (sess.station_type === 'Dining') {
        tables.push(entry);
      } else {
        terminals.push(entry);
      }
    });

    res.json({ success: true, terminals, tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Merge Console Session to Dining Table
router.post('/merge-to-table', verifyToken, async (req, res) => {
  const { consoleSessionId, diningSessionId } = req.body;
  if (!consoleSessionId || !diningSessionId) {
    return res.status(400).json({ success: false, message: 'Console and Dining sessions are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get console session details
    const [consoleSessions] = await conn.query(
      `SELECT s.*, st.name AS station_name 
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       WHERE s.id = ? AND s.status IN ('Active', 'Paused') FOR UPDATE`,
      [consoleSessionId]
    );
    if (consoleSessions.length === 0) {
      throw new Error('Active or paused console session not found');
    }
    const consoleSession = consoleSessions[0];

    // 2. Get dining session details
    const [diningSessions] = await conn.query(
      `SELECT id FROM game_sessions WHERE id = ? AND status IN ('Active', 'Paused') FOR UPDATE`,
      [diningSessionId]
    );
    if (diningSessions.length === 0) {
      throw new Error('Active or paused dining table session not found');
    }

    const now = pool.getDbNow();
    const startTime = new Date(consoleSession.start_time);
    const activeEndTime = consoleSession.status === 'Paused' ? new Date(consoleSession.pause_time) : now;
    
    // Calculate elapsed time (excluding pause time)
    const pausedSecs = parseInt(consoleSession.paused_duration_seconds || 0, 10);
    const elapsedSeconds = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - pausedSecs);

    let consoleCost = parseFloat(consoleSession.total_cost);
    let consoleQuantity = 0;
    
    if (consoleSession.target_end_time) {
      const targetEndTime = new Date(consoleSession.target_end_time);
      const totalPurchasedSeconds = Math.max(0, Math.floor((targetEndTime - startTime) / 1000) - pausedSecs);
      consoleQuantity = totalPurchasedSeconds / 3600;
      if (consoleSession.session_type === 'Postpaid') {
        consoleCost = parseFloat((consoleQuantity * parseFloat(consoleSession.hourly_rate)).toFixed(2));
      }
    } else {
      const billingSeconds = Math.max(900, elapsedSeconds); // 15 min minimum
      consoleQuantity = billingSeconds / 3600;
      if (consoleSession.session_type === 'Postpaid') {
        consoleCost = parseFloat((consoleQuantity * parseFloat(consoleSession.hourly_rate)).toFixed(2));
      }
    }

    // 3. Create a special POS sale for the dining table for the console charge
    const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
    const total = parseFloat(consoleCost.toFixed(2));
    const subtotal = parseFloat((total / (1 + (taxPercent / 100))).toFixed(2));
    const tax = parseFloat((total - subtotal).toFixed(2));

    const unitPrice = consoleQuantity > 0 ? parseFloat((subtotal / consoleQuantity).toFixed(2)) : 0;

    const consolePaymentMethod = consoleSession.payment_method || 'Cash';

    const [saleRes] = await conn.query(
      `INSERT INTO pos_sales (session_id, sale_type, subtotal, tax, discount, total, payment_method, status, created_by, merged_from_session_id) 
       VALUES (?, 'SessionBill', ?, ?, 0.00, ?, ?, 'Pending', ?, ?)`,
      [diningSessionId, subtotal, tax, total, consolePaymentMethod, req.user.id, consoleSessionId]
    );

    // Track linked session IDs for audit trail (best-effort)
    try {
      await conn.query('ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS linked_session_id INT DEFAULT NULL');
    } catch (_) { /* column may already exist */ }
    await conn.query('UPDATE game_sessions SET linked_session_id = ? WHERE id = ?', [diningSessionId, consoleSessionId]);
    await conn.query('UPDATE game_sessions SET linked_session_id = ? WHERE id = ?', [consoleSessionId, diningSessionId]);
    // Ensure inventory item 999 exists before referencing it
    await conn.query(
      `INSERT IGNORE INTO inventory (id, name, type, price, stock_qty, low_stock_threshold) 
       VALUES (999, 'Console Session Charge', 'Other', 0.00, 99999, 0)`
    );
    await conn.query(
      `UPDATE inventory SET id = 999 WHERE name = 'Console Session Charge' AND id != 999`
    );

    const saleId = saleRes.insertId;

    // Insert sale item (using placeholder Console Session Charge item ID: 999)
    await conn.query(
      `INSERT INTO pos_sale_items (sale_id, item_id, quantity, unit_price, total_price) 
       VALUES (?, 999, ?, ?, ?)`,
      [saleId, consoleQuantity, unitPrice, subtotal]
    );

    // 4. Move all existing pending food orders from console session to dining session
    await conn.query(
      'UPDATE pos_sales SET session_id = ? WHERE session_id = ? AND status = "Pending"',
      [diningSessionId, consoleSessionId]
    );

    // 5. Complete the console session (timer stops, station is freed)
    await conn.query(
      `UPDATE game_sessions 
       SET status = 'Completed', 
           end_time = CURRENT_TIMESTAMP, 
           total_cost = 0.00, 
           discount_applied = 0.00, 
           tax_applied = 0.00,
           payment_method = 'Merged' 
       WHERE id = ?`,
      [consoleSessionId]
    );

    // Set console station available
    await conn.query('UPDATE stations SET status = "Available" WHERE id = ?', [consoleSession.station_id]);

    await conn.commit();

    await logAudit(
      req.user.id,
      'Session Merge',
      `Merged Console Session ID: ${consoleSessionId} (${consoleSession.station_name}) into Dining Session ID: ${diningSessionId} (₹${consoleCost.toFixed(2)} transfer)`
    );

    // Broadcast station status update
    broadcast('station_update', { id: consoleSession.station_id, name: consoleSession.station_name, status: 'Available' });

    res.json({ success: true, message: 'Terminal session charges and food orders successfully merged into dining table! Checkout the table to complete payment.' });
  } catch (err) {
    await conn.rollback();
    handleError(res, err, 'Failed to merge terminal session to table');
  } finally {
    conn.release();
  }
});

// Merge Dining Table Session INTO a Terminal Session (reverse direction)
router.post('/merge-from-table', verifyToken, async (req, res) => {
  const { diningSessionId, terminalSessionId } = req.body;
  if (!diningSessionId || !terminalSessionId) {
    return res.status(400).json({ success: false, message: 'Dining session and terminal session are required' });
  }
  if (parseInt(diningSessionId) === parseInt(terminalSessionId)) {
    return res.status(400).json({ success: false, message: 'Cannot merge a session into itself' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get dining table session
    const [diningSessions] = await conn.query(
      `SELECT gs.*, st.name AS station_name, st.id AS station_id
       FROM game_sessions gs
       JOIN stations st ON gs.station_id = st.id
       WHERE gs.id = ? AND gs.status IN ('Active', 'Paused') FOR UPDATE`,
      [diningSessionId]
    );
    if (diningSessions.length === 0) {
      throw new Error('Active or paused dining table session not found');
    }
    const diningSession = diningSessions[0];

    // 2. Get terminal session — must be active and not Dining type
    const [terminalSessions] = await conn.query(
      `SELECT gs.id, st.name AS station_name, st.type AS station_type
       FROM game_sessions gs
       JOIN stations st ON gs.station_id = st.id
       WHERE gs.id = ? AND gs.status IN ('Active', 'Paused') FOR UPDATE`,
      [terminalSessionId]
    );
    if (terminalSessions.length === 0) {
      throw new Error('Active or paused terminal session not found');
    }
    const terminalSession = terminalSessions[0];
    if (terminalSession.station_type === 'Dining') {
      throw new Error('Target session must be a terminal (PC, PS5, Xbox, etc.) not a dining table');
    }

    // 3. Calculate dining session time cost (usually 0 since Dining hourly rate = 0)
    // but we still move all pending food POS orders from dining → terminal
    const now = pool.getDbNow();
    const startTime = new Date(diningSession.start_time);
    const activeEndTime = diningSession.status === 'Paused' ? new Date(diningSession.pause_time) : now;
    const pausedSecs = parseInt(diningSession.paused_duration_seconds || 0, 10);
    const elapsedSeconds = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - pausedSecs);

    const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
    let tableCost = parseFloat(diningSession.total_cost || 0);
    let tableQuantity = 0;

    if (diningSession.target_end_time) {
      const targetEnd = new Date(diningSession.target_end_time);
      const totalPurchSecs = Math.max(0, Math.floor((targetEnd - startTime) / 1000) - pausedSecs);
      tableQuantity = totalPurchSecs / 3600;
      if (diningSession.session_type === 'Postpaid') {
        tableCost = parseFloat((tableQuantity * parseFloat(diningSession.hourly_rate)).toFixed(2));
      }
    } else {
      tableQuantity = elapsedSeconds / 3600;
      if (diningSession.session_type === 'Postpaid' && parseFloat(diningSession.hourly_rate) > 0) {
        const billSecs = Math.max(900, elapsedSeconds);
        tableQuantity = billSecs / 3600;
        tableCost = parseFloat((tableQuantity * parseFloat(diningSession.hourly_rate)).toFixed(2));
      }
    }

    // 4. If dining table has time cost > 0, create a POS sale item on the terminal session
    if (tableCost > 0) {
      const tableTotal = parseFloat(tableCost.toFixed(2));
      const tableSubtotal = parseFloat((tableTotal / (1 + (taxPercent / 100))).toFixed(2));
      const tableTax = parseFloat((tableTotal - tableSubtotal).toFixed(2));
      const unitPrice = tableQuantity > 0 ? parseFloat((tableSubtotal / tableQuantity).toFixed(2)) : 0;

      // Ensure placeholder item 1000 for Dining Table Charge exists
      await conn.query(
        `INSERT IGNORE INTO inventory (id, name, type, price, stock_qty, low_stock_threshold)
         VALUES (1000, 'Dining Table Charge', 'Other', 0.00, 99999, 0)`
      );

      const [diningSaleRes] = await conn.query(
        `INSERT INTO pos_sales (session_id, sale_type, subtotal, tax, discount, total, payment_method, status, created_by, merged_from_session_id)
         VALUES (?, 'SessionBill', ?, ?, 0.00, ?, 'Cash', 'Pending', ?, ?)`,
        [terminalSessionId, tableSubtotal, tableTax, tableTotal, req.user.id, diningSessionId]
      );

      await conn.query(
        `INSERT INTO pos_sale_items (sale_id, item_id, quantity, unit_price, total_price)
         VALUES (?, 1000, ?, ?, ?)`,
        [diningSaleRes.insertId, tableQuantity, unitPrice, tableSubtotal]
      );
    }

    // 5. Move all existing pending food orders from dining session to terminal session
    await conn.query(
      'UPDATE pos_sales SET session_id = ? WHERE session_id = ? AND status = \'Pending\'',
      [terminalSessionId, diningSessionId]
    );

    // 6. Track linked sessions for audit trail
    await conn.query('UPDATE game_sessions SET linked_session_id = ? WHERE id = ?', [terminalSessionId, diningSessionId]);
    await conn.query('UPDATE game_sessions SET linked_session_id = ? WHERE id = ?', [diningSessionId, terminalSessionId]).catch(() => {});

    // 7. Complete the dining session — free the table
    await conn.query(
      `UPDATE game_sessions
       SET status = 'Completed',
           end_time = CURRENT_TIMESTAMP,
           total_cost = 0.00,
           discount_applied = 0.00,
           tax_applied = 0.00,
           payment_method = 'Merged'
       WHERE id = ?`,
      [diningSessionId]
    );

    // 8. Set dining table station available
    await conn.query('UPDATE stations SET status = \'Available\' WHERE id = ?', [diningSession.station_id]);

    await conn.commit();

    await logAudit(
      req.user.id,
      'Session Merge',
      `Merged Dining Table Session ID: ${diningSessionId} (${diningSession.station_name}) into Terminal Session ID: ${terminalSessionId} (${terminalSession.station_name}). Food orders transferred.`
    );

    broadcast('station_update', { id: diningSession.station_id, name: diningSession.station_name, status: 'Available' });

    res.json({ success: true, message: `Table charges and food orders merged into terminal session! Checkout the terminal to complete payment.` });
  } catch (err) {
    await conn.rollback();
    handleError(res, err, 'Failed to merge table session to terminal');
  } finally {
    conn.release();
  }
});

module.exports = router;
