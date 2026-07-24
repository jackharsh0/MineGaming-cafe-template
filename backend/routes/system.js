const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/helper');

// Get Audit Logs (Admin/Manager only)
router.get('/audit-logs', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.username, u.full_name, u.role
      FROM audit_logs a
      JOIN users_admin u ON a.user_id = u.id
      ORDER BY a.timestamp DESC LIMIT 100
    `);
    res.json({ success: true, logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Manual Database Backup (Admin only)
router.post('/backup', verifyToken, requireRole(['SuperAdmin']), async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backup_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFilename);

    let sqlDump = `-- Gaming Zone Backup Dump\n-- Generated on ${new Date().toISOString()}\n\n`;
    sqlDump += `CREATE DATABASE IF NOT EXISTS \`gaming_zone\`;\nUSE \`gaming_zone\`;\n\n`;

    const tables = [
      'users_admin', 'stations', 'players', 'pricing_rules',
      'game_sessions', 'inventory', 'pos_sales',
      'pos_sale_items', 'shift_logs', 'audit_logs', 'coupons',
      'appointments', 'categories', 'whatsapp_queue', 'system_settings'
    ];

    for (const table of tables) {
      sqlDump += `-- ------------------------------------------------------\n`;
      sqlDump += `-- Table structure and data for table \`${table}\`\n`;
      sqlDump += `-- ------------------------------------------------------\n\n`;

      // Get Create Table statement
      const [createTableResult] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
      if (createTableResult.length > 0) {
        const createSQL = createTableResult[0]['Create Table'];
        sqlDump += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        sqlDump += `${createSQL};\n\n`;
      }

      // Get Table Rows
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        sqlDump += `INSERT INTO \`${table}\` VALUES \n`;
        
        const valueStrings = rows.map(row => {
          const rowValues = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') {
              // Escape quotes and backslashes
              const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              return `'${escaped}'`;
            }
            if (val instanceof Date) {
              return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            }
            return val;
          });
          return `(${rowValues.join(', ')})`;
        });

        sqlDump += valueStrings.join(',\n') + ';\n\n';
      }
    }

    fs.writeFileSync(backupPath, sqlDump, 'utf8');

    await logAudit(req.user.id, 'DB Backup', `Manual database backup created: ${backupFilename}`);
    
    res.json({ 
      success: true, 
      message: 'Backup created successfully', 
      filename: backupFilename,
      downloadUrl: `/api/system/backup/download/${backupFilename}`
    });

  } catch (err) {
    console.error('Backup creation failed:', err);
    res.status(500).json({ success: false, message: 'Backup failed' });
  }
});

// Download Backup File
router.get('/backup/download/:filename', verifyToken, requireRole(['SuperAdmin']), (req, res) => {
  const { filename } = req.params;
  const backupPath = path.resolve(__dirname, '../backups', filename);

  if (fs.existsSync(backupPath)) {
    res.download(backupPath, filename);
  } else {
    res.status(404).json({ success: false, message: 'Backup file not found' });
  }
});

module.exports = router;
