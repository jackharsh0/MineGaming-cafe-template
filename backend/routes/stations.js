const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');
const { broadcast } = require('./realtime');

// Get all stations
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stations WHERE is_deleted = 0 ORDER BY type, name');
    res.json({ success: true, stations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add Station (Admin/Manager only)
// Add Station (Admin/Manager only)
router.post('/', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { name, type, specs_cpu, specs_gpu, specs_ram, specs_peripherals, ip_address, mac_address } = req.body;
  if (!name || !type) {
    return res.status(400).json({ success: false, message: 'Name and Type are required' });
  }

  try {
    // Check if there is an existing station with the same name (active or soft-deleted)
    const [existing] = await pool.query('SELECT id, is_deleted FROM stations WHERE name = ?', [name]);
    if (existing.length > 0) {
      if (existing[0].is_deleted === 1) {
        // Reactivate soft-deleted station and update its specs
        await pool.query(
          `UPDATE stations SET is_deleted = 0, type = ?, specs_cpu = ?, specs_gpu = ?, specs_ram = ?, specs_peripherals = ?, ip_address = ?, mac_address = ?, status = 'Available' 
           WHERE id = ?`,
          [type, specs_cpu || null, specs_gpu || null, specs_ram || null, specs_peripherals || null, ip_address || null, mac_address || null, existing[0].id]
        );
        await logAudit(req.user.id, 'Station Add (Reactivate)', `Reactivated soft-deleted station ${name} (${type})`);
        
        // Broadcast status change
        broadcast('station_update', { id: existing[0].id, name, type, status: 'Available' });

        return res.json({ success: true, message: 'Station added (reactivated) successfully', stationId: existing[0].id });
      } else {
        return res.status(400).json({ success: false, message: 'A station with this name already exists' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO stations (name, type, specs_cpu, specs_gpu, specs_ram, specs_peripherals, ip_address, mac_address, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
      [name, type, specs_cpu || null, specs_gpu || null, specs_ram || null, specs_peripherals || null, ip_address || null, mac_address || null]
    );

    const newId = result.insertId;
    await logAudit(req.user.id, 'Station Add', `Added station ${name} (${type})`);
    
    // Broadcast status change
    broadcast('station_update', { id: newId, name, type, status: 'Available' });

    res.json({ success: true, message: 'Station added successfully', stationId: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Batch Add Stations
router.post('/batch', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { name_prefix, type, count, start_number } = req.body;
  if (!name_prefix || !type || !count || count < 1) {
    return res.status(400).json({ success: false, message: 'Name prefix, type, and valid count are required' });
  }

  if (count > 50) {
    return res.status(400).json({ success: false, message: 'Maximum 50 stations per batch' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const startNum = parseInt(start_number) || 1;
    const createdStations = [];

    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const padded = String(num).padStart(2, '0');
      const stationName = `${name_prefix}-${padded}`;

      // Check if name exists
      const [existing] = await conn.query(
        'SELECT id, is_deleted FROM stations WHERE name = ?',
        [stationName]
      );

      if (existing.length > 0) {
        if (existing[0].is_deleted === 1) {
          await conn.query(
            `UPDATE stations SET is_deleted = 0, type = ?, status = 'Available' WHERE id = ?`,
            [type, existing[0].id]
          );
          createdStations.push({ id: existing[0].id, name: stationName, reactivated: true });
        }
        continue;
      }

      const [result] = await conn.query(
        `INSERT INTO stations (name, type, status) VALUES (?, ?, 'Available')`,
        [stationName, type]
      );
      createdStations.push({ id: result.insertId, name: stationName, reactivated: false });
    }

    await conn.commit();

    await logAudit(
      req.user.id,
      'Station Batch Add',
      `Batch added ${createdStations.length} stations with prefix "${name_prefix}" (${type}), requested ${count}`
    );

    // Broadcast for all created stations
    createdStations.forEach(s => {
      broadcast('station_update', { id: s.id, name: s.name, type, status: 'Available' });
    });

    res.json({
      success: true,
      message: `${createdStations.length} station(s) added successfully!`,
      stations: createdStations
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during batch creation' });
  } finally {
    conn.release();
  }
});

// Edit Station (Admin/Manager only)
router.put('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  const { name, type, specs_cpu, specs_gpu, specs_ram, specs_peripherals, ip_address, mac_address } = req.body;

  if (!name || !type) {
    return res.status(400).json({ success: false, message: 'Name and Type are required' });
  }

  try {
    // Check if name is taken by another station
    const [existing] = await pool.query('SELECT id, is_deleted FROM stations WHERE name = ? AND id != ?', [name, id]);
    if (existing.length > 0) {
      if (existing[0].is_deleted === 1) {
        return res.status(400).json({ success: false, message: 'A deleted station with this name exists. Please restore or choose a different name.' });
      } else {
        return res.status(400).json({ success: false, message: 'A station with this name already exists' });
      }
    }

    await pool.query(
      `UPDATE stations SET name = ?, type = ?, specs_cpu = ?, specs_gpu = ?, specs_ram = ?, specs_peripherals = ?, ip_address = ?, mac_address = ? 
       WHERE id = ?`,
      [name, type, specs_cpu || null, specs_gpu || null, specs_ram || null, specs_peripherals || null, ip_address || null, mac_address || null, id]
    );

    await logAudit(req.user.id, 'Station Edit', `Edited station ${name} (ID: ${id})`);
    
    // Broadcast
    broadcast('station_update', { id, name, type });

    res.json({ success: true, message: 'Station updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle Maintenance Status Quick-Toggle
router.patch('/:id/maintenance', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT name, status FROM stations WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    const station = rows[0];
    let newStatus = 'Available';
    
    if (station.status === 'Available') {
      newStatus = 'Maintenance';
    } else if (station.status === 'Occupied') {
      return res.status(400).json({ success: false, message: 'Cannot place active session station under maintenance' });
    }

    await pool.query('UPDATE stations SET status = ? WHERE id = ?', [newStatus, id]);
    await logAudit(req.user.id, 'Station Maintenance Toggle', `Station ${station.name} status updated to ${newStatus}`);

    // Broadcast update
    broadcast('station_update', { id, name: station.name, status: newStatus });

    res.json({ success: true, message: `Station is now ${newStatus}`, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Station (Admin/Manager only)
router.delete('/:id', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT name, status FROM stations WHERE id = ? AND is_deleted = 0', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    if (rows[0].status === 'Occupied') {
      return res.status(400).json({ success: false, message: 'Cannot delete an active station' });
    }

    await pool.query('UPDATE stations SET is_deleted = 1 WHERE id = ?', [id]);
    await logAudit(req.user.id, 'Station Delete', `Deleted station ${rows[0].name} (ID: ${id})`);

    // Broadcast removal
    broadcast('station_update', { id, action: 'deleted' });

    res.json({ success: true, message: 'Station deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/public-status', async (req, res) => {
  try {
    const [stations] = await pool.query('SELECT id, name, type, status FROM stations WHERE is_deleted = 0 ORDER BY type, name');
    const [rates] = await pool.query('SELECT station_type, hourly_rate, controller_addon_rate FROM pricing_rules');
    const [settings] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'enabled_station_types'");
    let enabledTypes = null;
    if (settings.length > 0 && settings[0].setting_value) {
      try { enabledTypes = JSON.parse(settings[0].setting_value); } catch(e) { enabledTypes = null; }
    }
    res.json({ success: true, stations, rates, enabledTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
