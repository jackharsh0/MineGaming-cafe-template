const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit, calculateHourlyRate, getSystemSetting } = require('../utils/helper');
const { broadcast } = require('./realtime');
const { handleError } = require('../utils/error');

// Get all active sessions
router.get('/active', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, st.name AS station_name, st.type AS station_type, p.name AS player_name, p.phone AS player_phone
      FROM game_sessions s
      JOIN stations st ON s.station_id = st.id
      LEFT JOIN players p ON s.player_id = p.id
      WHERE s.status IN ('Active', 'Paused')
      ORDER BY s.start_time DESC
    `);
    res.json({ success: true, sessions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start Session
router.post('/start', verifyToken, async (req, res) => {
  const { stationId, playerId, sessionType, controllerCount, durationMinutes, prepaidAmount, paymentMethod } = req.body;

  if (!stationId || !sessionType) {
    return res.status(400).json({ success: false, message: 'Station and session type are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify station is Available
    const [stations] = await conn.query('SELECT name, type, status FROM stations WHERE id = ? FOR UPDATE', [stationId]);
    if (stations.length === 0) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }
    const station = stations[0];
    if (req.user.role === 'Attendant' && station.type !== 'Dining') {
      return res.status(403).json({ success: false, message: 'Forbidden: Attendants are only authorized to start dining table sessions.' });
    }
    if (station.status !== 'Available') {
      return res.status(400).json({ success: false, message: `Station is currently ${station.status.toLowerCase()}` });
    }

    // 2. Verify player if selected
    let player = null;
    if (playerId) {
      const [players] = await conn.query('SELECT * FROM players WHERE id = ? FOR UPDATE', [playerId]);
      if (players.length === 0) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }
      player = players[0];
      if (player.is_blacklisted) {
        return res.status(400).json({ success: false, message: 'Cannot start session: Player is blacklisted!' });
      }
    }

    // 3. Determine pricing rules
    const [rates] = await conn.query('SELECT * FROM pricing_rules WHERE station_type = ?', [station.type]);
    if (rates.length === 0) {
      return res.status(500).json({ success: false, message: 'No pricing rule defined for this station type' });
    }
    
    const loyaltyTier = player ? player.loyalty_tier : null;
    const finalHourlyRate = await calculateHourlyRate(station.type, loyaltyTier, controllerCount || 1);

    let targetEndTime = null;
    let totalCost = 0.00;

    // 4. Handle Prepaid vs Postpaid
    if (sessionType === 'Prepaid') {
      let calcDurationMinutes = 0;
      if (prepaidAmount && parseFloat(prepaidAmount) > 0) {
        totalCost = parseFloat(prepaidAmount);
        calcDurationMinutes = Math.floor((totalCost / finalHourlyRate) * 60);
      } else if (durationMinutes && parseInt(durationMinutes) > 0) {
        calcDurationMinutes = parseInt(durationMinutes);
        totalCost = parseFloat(((calcDurationMinutes / 60) * finalHourlyRate).toFixed(2));
      } else {
        return res.status(400).json({ success: false, message: 'Prepaid amount or duration is required' });
      }

      // Handle debit from play hours if requested
      if (paymentMethod === 'PlayHours') {
        if (!player) {
          return res.status(400).json({ success: false, message: 'Registered player account is required to pay using play hours.' });
        }
        const hoursToDeduct = calcDurationMinutes / 60;
        if (parseFloat(player.play_hours) < hoursToDeduct) {
          return res.status(400).json({ success: false, message: `Insufficient play hours balance. Available: ${player.play_hours} Hours, Needed: ${hoursToDeduct.toFixed(2)} Hours` });
        }
        await conn.query('UPDATE players SET play_hours = play_hours - ? WHERE id = ?', [hoursToDeduct, player.id]);
        
        // Insert POS sale record
        const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
        const sub = parseFloat((totalCost / (1 + (taxPercent / 100))).toFixed(2));
        const tx = parseFloat((totalCost - sub).toFixed(2));
        await conn.query(
          `INSERT INTO pos_sales (player_id, sale_type, subtotal, tax, discount, total, payment_method, play_hours_amount, cash_amount, status, created_by)
           VALUES (?, 'Direct', ?, ?, 0.00, ?, 'PlayHours', ?, 0.00, 'Paid', ?)`,
          [player.id, sub, tx, totalCost, hoursToDeduct, req.user.id]
        );
      } else if (paymentMethod === 'Cash' || paymentMethod === 'Card') {
        // Record direct POS sale
        const taxPercent = parseFloat(await getSystemSetting('tax_percent', '10.00'));
        const sub = parseFloat((totalCost / (1 + (taxPercent / 100))).toFixed(2));
        const tx = parseFloat((totalCost - sub).toFixed(2));
        await conn.query(
          `INSERT INTO pos_sales (player_id, sale_type, subtotal, tax, discount, total, payment_method, play_hours_amount, cash_amount, status, created_by)
           VALUES (?, 'Direct', ?, ?, 0.00, ?, ?, 0.00, ?, 'Paid', ?)`,
          [playerId || null, sub, tx, totalCost, paymentMethod, totalCost, req.user.id]
        );
      }

      const now = pool.getDbNow();
      targetEndTime = new Date(now.getTime() + calcDurationMinutes * 60000);
    } else {
      // Postpaid optionally timed limit
      let calcDurationMinutes = 0;
      if (durationMinutes && parseInt(durationMinutes) > 0) {
        calcDurationMinutes = parseInt(durationMinutes);
      } else if (prepaidAmount && parseFloat(prepaidAmount) > 0) {
        // Limit postpaid by cash amount configuration
        calcDurationMinutes = Math.floor((parseFloat(prepaidAmount) / finalHourlyRate) * 60);
      }
      
      if (calcDurationMinutes > 0) {
        const now = pool.getDbNow();
        targetEndTime = new Date(now.getTime() + calcDurationMinutes * 60000);
      }
    }

    // 5. Insert Session
    const [result] = await conn.query(
      `INSERT INTO game_sessions 
       (station_id, player_id, session_type, start_time, target_end_time, hourly_rate, controller_count, total_cost, status, created_by, payment_method)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, 'Active', ?, ?)`,
      [stationId, playerId || null, sessionType, targetEndTime, finalHourlyRate, controllerCount || 1, totalCost, req.user.id, sessionType === 'Prepaid' ? (paymentMethod || 'Cash') : null]
    );

    // 6. Update Station Status
    await conn.query('UPDATE stations SET status = "Occupied" WHERE id = ?', [stationId]);

    await conn.commit();

    // Audit and Broadcast
    const sessId = result.insertId;
    await logAudit(
      req.user.id,
      'Session Start',
      `Started ${sessionType} session (ID: ${sessId}) on ${station.name} for player ${player ? player.name : 'Walk-in'}`
    );
    
    broadcast('station_update', { id: stationId, name: station.name, status: 'Occupied' });

    res.json({
      success: true,
      message: 'Session started successfully',
      sessionId: sessId
    });
  } catch (err) {
    await conn.rollback();
    handleError(res, err, 'Server error');
  } finally {
    conn.release();
  }
});

// Pause Session
router.post('/:id/pause', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT s.*, st.name AS station_name FROM game_sessions s JOIN stations st ON s.station_id = st.id WHERE s.id = ? AND s.status = "Active"',
      [id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Active session not found' });
    }

    const session = rows[0];
    await pool.query(
      'UPDATE game_sessions SET status = "Paused", pause_time = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    await logAudit(req.user.id, 'Session Pause', `Paused session ID: ${id} on ${session.station_name}`);
    res.json({ success: true, message: 'Session paused successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Resume Session
router.post('/:id/resume', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT s.*, st.name AS station_name, TIMESTAMPDIFF(SECOND, s.pause_time, CURRENT_TIMESTAMP) AS pause_duration_secs 
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       WHERE s.id = ? AND s.status = "Paused"`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Paused session not found' });
    }

    const session = rows[0];
    const pauseDurationSeconds = session.pause_duration_secs || 0;

    await pool.query(
      `UPDATE game_sessions 
       SET status = "Active", 
           paused_duration_seconds = paused_duration_seconds + ?, 
           pause_time = NULL,
           target_end_time = CASE 
             WHEN session_type = 'Prepaid' AND target_end_time IS NOT NULL THEN DATE_ADD(target_end_time, INTERVAL ? SECOND)
             ELSE target_end_time
           END
       WHERE id = ?`,
      [pauseDurationSeconds, pauseDurationSeconds, id]
    );

    await logAudit(req.user.id, 'Session Resume', `Resumed session ID: ${id} on ${session.station_name}`);
    res.json({ success: true, message: 'Session resumed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Extend Session (Prepaid)
router.post('/:id/extend', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { minutes, amount } = req.body; // Either minutes or amount

  try {
    const [rows] = await pool.query(
      `SELECT s.*, st.type AS station_type, st.name AS station_name, p.loyalty_tier 
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       LEFT JOIN players p ON s.player_id = p.id
       WHERE s.id = ? AND s.status IN ('Active', 'Paused')`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Active or paused session not found' });
    }

    const session = rows[0];
    const rate = parseFloat(session.hourly_rate);
    let extraMinutes = 0;
    let extraCost = 0.00;

    if (amount && parseFloat(amount) > 0) {
      extraCost = parseFloat(amount);
      extraMinutes = Math.floor((extraCost / rate) * 60);
    } else if (minutes && parseInt(minutes) > 0) {
      extraMinutes = parseInt(minutes);
      extraCost = parseFloat(((extraMinutes / 60) * rate).toFixed(2));
    } else {
      return res.status(400).json({ success: false, message: 'Valid extension time or amount is required' });
    }

    await pool.query(
      `UPDATE game_sessions 
       SET target_end_time = DATE_ADD(target_end_time, INTERVAL ? MINUTE), 
           total_cost = total_cost + ? 
       WHERE id = ?`,
      [extraMinutes, extraCost, id]
    );

    // Fetch the updated target_end_time
    const [updated] = await pool.query('SELECT target_end_time FROM game_sessions WHERE id = ?', [id]);
    const newTarget = updated.length > 0 ? updated[0].target_end_time : null;

    await logAudit(
      req.user.id,
      'Session Extend',
      `Extended session ID: ${id} on ${session.station_name} by ${extraMinutes} mins (₹${extraCost})`
    );

    res.json({ success: true, message: 'Session extended successfully', newTarget, extraCost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Transfer Station Wizard
router.post('/:id/transfer', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { targetStationId } = req.body;

  try {
    // 1. Get active session details
    const [sessions] = await pool.query(
      `SELECT s.*, st.name AS source_name, st.type AS source_type, p.loyalty_tier
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       LEFT JOIN players p ON s.player_id = p.id
       WHERE s.id = ? AND s.status = "Active"`,
      [id]
    );
    if (sessions.length === 0) {
      return res.status(400).json({ success: false, message: 'Active session not found' });
    }
    const session = sessions[0];

    // 2. Get target station details
    const [targets] = await pool.query('SELECT name, type, status FROM stations WHERE id = ?', [targetStationId]);
    if (targets.length === 0) {
      return res.status(404).json({ success: false, message: 'Target station not found' });
    }
    const targetStation = targets[0];
    if (targetStation.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'Target station is not available' });
    }

    // 3. Recalculate rate for target station
    const [rates] = await pool.query('SELECT * FROM pricing_rules WHERE station_type = ?', [targetStation.type]);
    if (rates.length === 0) {
      return res.status(500).json({ success: false, message: 'No pricing rule defined for target station type' });
    }
    
    const loyaltyTier = session.loyalty_tier || null;
    const newHourlyRate = await calculateHourlyRate(targetStation.type, loyaltyTier, session.controller_count);

    const now = pool.getDbNow();

    if (session.session_type === 'Prepaid') {
      // Prepaid transfer logic: convert remaining time cash value to target station rate
      const targetEndTime = new Date(session.target_end_time);
      const remainingSeconds = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      
      const remainingCashValue = (remainingSeconds / 3600) * parseFloat(session.hourly_rate);
      const newRemainingSeconds = Math.floor((remainingCashValue / newHourlyRate) * 3600);
      
      const newTargetEndTime = new Date(now.getTime() + newRemainingSeconds * 1000);

      // Update session record
      await pool.query(
        `UPDATE game_sessions 
         SET station_id = ?, hourly_rate = ?, target_end_time = ? 
         WHERE id = ?`,
        [targetStationId, newHourlyRate, newTargetEndTime, id]
      );
    } else {
      // Postpaid transfer: accumulate elapsed billing on old station, update rate going forward
      // We will record the start_time of the new station as 'now' but keeping the same session record.
      // To keep it simple, we calculate the cost incurred on old station, add it to 'total_cost' as base cost, 
      // and reset the start_time to now (adjusting paused_duration_seconds)
      const startTime = new Date(session.start_time);
      const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000) - session.paused_duration_seconds);
      const accruedCost = parseFloat(((elapsedSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));

      await pool.query(
        `UPDATE game_sessions 
         SET station_id = ?, 
             hourly_rate = ?, 
             total_cost = total_cost + ?,
             start_time = CURRENT_TIMESTAMP,
             paused_duration_seconds = 0
         WHERE id = ?`,
        [targetStationId, newHourlyRate, accruedCost, id]
      );
    }

    // 4. Update station statuses
    await pool.query('UPDATE stations SET status = "Available" WHERE id = ?', [session.station_id]);
    await pool.query('UPDATE stations SET status = "Occupied" WHERE id = ?', [targetStationId]);

    await logAudit(
      req.user.id,
      'Station Transfer',
      `Transferred Session ID: ${id} from ${session.source_name} to ${targetStation.name}`
    );

    // Broadcast station updates
    broadcast('station_update', { id: session.station_id, name: session.source_name, status: 'Available' });
    broadcast('station_update', { id: targetStationId, name: targetStation.name, status: 'Occupied' });

    res.json({ success: true, message: 'Station transferred successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Stop Session (Prepaid timer manually)
router.post('/:id/stop', verifyToken, async (req, res) => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get session info
    const [sessions] = await conn.query(
      `SELECT s.*, st.name AS station_name 
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       WHERE s.id = ? AND s.status IN ('Active', 'Paused') FOR UPDATE`,
      [id]
    );

    if (sessions.length === 0) {
      throw new Error('Active or paused session not found');
    }

    const session = sessions[0];

    // 2. Mark session completed
    await conn.query(
      `UPDATE game_sessions 
       SET status = 'Completed', 
           end_time = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    // 3. Mark pending POS items paid (if any)
    await conn.query(
      'UPDATE pos_sales SET status = "Paid" WHERE session_id = ? AND status = "Pending"',
      [id]
    );

    // 4. Set station status available
    await conn.query('UPDATE stations SET status = "Available" WHERE id = ?', [session.station_id]);

    await conn.commit();

    await logAudit(
      req.user.id,
      'Session Stop (Prepaid)',
      `Manually stopped Prepaid Session ID: ${id} on ${session.station_name}`
    );

    // Broadcast station available
    broadcast('station_update', { id: session.station_id, name: session.station_name, status: 'Available' });

    res.json({ success: true, message: 'Session stopped and station freed successfully' });

  } catch (err) {
    await conn.rollback();
    handleError(res, err, 'Server error stopping session');
  } finally {
    conn.release();
  }
});

// Get active session for a specific station
router.get('/station/:stationId', verifyToken, async (req, res) => {
  const { stationId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT s.*, st.name AS station_name 
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       WHERE s.station_id = ? AND s.status IN ('Active', 'Paused')
       LIMIT 1`,
      [stationId]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: 'No active session for this station' });
    }
    res.json({ success: true, session: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
