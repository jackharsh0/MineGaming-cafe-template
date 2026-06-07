const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyTokenOptional, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');
const { broadcast } = require('./realtime');

// Get all appointments
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, s.name AS station_name, s.type AS station_type 
      FROM appointments a
      JOIN stations s ON a.station_id = s.id
      ORDER BY a.start_time ASC
    `);
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create appointment (Publicly accessible)
router.post('/', verifyTokenOptional, async (req, res) => {
  const { playerName, playerPhone, stationId, startTime, endTime, notes } = req.body;

  if (!playerName || !playerPhone || !stationId || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'All fields except notes are required' });
  }

  // Ensure start_time is before end_time
  if (new Date(startTime) >= new Date(endTime)) {
    return res.status(400).json({ success: false, message: 'Start time must be before end time' });
  }

  try {
    // 1. Check double-booking conflict
    const [conflict] = await pool.query(
      `SELECT id FROM appointments 
       WHERE station_id = ? 
         AND status NOT IN ('Cancelled', 'Completed') 
         AND start_time < ? 
         AND end_time > ?`,
      [stationId, endTime, startTime]
    );

    if (conflict.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'This station is already booked during the selected time window' 
      });
    }

    // 2. Insert appointment
    const [result] = await pool.query(
      `INSERT INTO appointments (player_name, player_phone, station_id, start_time, end_time, status, notes)
       VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
      [playerName, playerPhone, stationId, startTime, endTime, notes || null]
    );

    const userId = req.user ? req.user.id : 1; // Default to system admin ID 1 if public guest
    await logAudit(userId, 'Appointment Create', `Scheduled appointment for ${playerName} on station ID: ${stationId}`);

    // Broadcast appointment creation via SSE
    broadcast('new_appointment', {
      id: result.insertId,
      playerName,
      playerPhone,
      stationId,
      startTime,
      endTime,
      notes
    });

    res.json({ 
      success: true, 
      message: 'Appointment scheduled successfully', 
      appointmentId: result.insertId 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update appointment
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { playerName, playerPhone, stationId, startTime, endTime, status, notes } = req.body;

  if (!playerName || !playerPhone || !stationId || !startTime || !endTime || !status) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  if (new Date(startTime) >= new Date(endTime)) {
    return res.status(400).json({ success: false, message: 'Start time must be before end time' });
  }

  try {
    // Check conflicts excluding this appointment
    if (status !== 'Cancelled' && status !== 'Completed') {
      const [conflict] = await pool.query(
        `SELECT id FROM appointments 
         WHERE station_id = ? 
           AND id != ?
           AND status NOT IN ('Cancelled', 'Completed') 
           AND start_time < ? 
           AND end_time > ?`,
        [stationId, id, endTime, startTime]
      );

      if (conflict.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Conflict detected: The station is booked during the selected time slot' 
        });
      }
    }

    // Update fields
    await pool.query(
      `UPDATE appointments 
       SET player_name = ?, player_phone = ?, station_id = ?, start_time = ?, end_time = ?, status = ?, notes = ?
       WHERE id = ?`,
      [playerName, playerPhone, stationId, startTime, endTime, status, notes || null, id]
    );

    await logAudit(req.user.id, 'Appointment Edit', `Updated appointment ID: ${id} for ${playerName}`);

    res.json({ success: true, message: 'Appointment updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update appointment status quick-toggle
router.patch('/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  try {
    const [rows] = await pool.query('SELECT player_name, station_id, start_time, end_time FROM appointments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const appt = rows[0];

    // If changing to Confirmed or Pending, re-verify conflicts
    if (status === 'Confirmed' || status === 'Pending') {
      const [conflict] = await pool.query(
        `SELECT id FROM appointments 
         WHERE station_id = ? 
           AND id != ?
           AND status NOT IN ('Cancelled', 'Completed') 
           AND start_time < ? 
           AND end_time > ?`,
        [appt.station_id, id, appt.end_time, appt.start_time]
      );

      if (conflict.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot confirm appointment: Station is already booked by another active appointment' 
        });
      }
    }

    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    await logAudit(req.user.id, 'Appointment Status Change', `Changed status of Appointment ID: ${id} for ${appt.player_name} to ${status}`);

    res.json({ success: true, message: `Appointment status updated to ${status}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete appointment
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT player_name FROM appointments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    await pool.query('DELETE FROM appointments WHERE id = ?', [id]);
    await logAudit(req.user.id, 'Appointment Delete', `Deleted appointment ID: ${id} for ${rows[0].player_name}`);

    res.json({ success: true, message: 'Appointment deleted successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
