const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
  database: process.env.DB_NAME || 'gaming_zone',
  waitForConnections: true,
  connectionLimit: 25,
  queueLimit: 0,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 60000
});

let dbClockOffsetMs = 0;

// Sync offset on boot
pool.query('SELECT CURRENT_TIMESTAMP() as db_time')
  .then(([rows]) => {
    if (rows.length > 0) {
      const dbTime = new Date(rows[0].db_time);
      const nodeTime = new Date();
      dbClockOffsetMs = dbTime - nodeTime;
      console.log(`[Time Sync] Database clock offset is ${dbClockOffsetMs} ms`);
    }
  })
  .catch(err => {
    console.error('Failed to sync database clock:', err);
  });

pool.getDbNow = function() {
  return new Date(Date.now() + dbClockOffsetMs);
};

module.exports = pool;
