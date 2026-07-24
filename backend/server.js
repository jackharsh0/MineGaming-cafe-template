const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing in .env file. Exiting...');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:1000';
const localOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (localOriginPattern.test(origin) || origin === corsOrigin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Import SSE router & broadcast utility
const { router: realtimeRouter, broadcast } = require('./routes/realtime');

// Import other routers
const authRouter = require('./routes/auth');
const stationsRouter = require('./routes/stations');
const playersRouter = require('./routes/players');
const sessionsRouter = require('./routes/sessions');
const inventoryRouter = require('./routes/inventory');
const posRouter = require('./routes/pos');
const billingRouter = require('./routes/billing');
const analyticsRouter = require('./routes/analytics');
const systemRouter = require('./routes/system');
const appointmentsRouter = require('./routes/appointments');
const usersRouter = require('./routes/users');
const categoriesRouter = require('./routes/categories');
const whatsappRouter = require('./routes/whatsapp');
const settingsRouter = require('./routes/settings');
const { initializeWhatsApp } = require('./utils/whatsapp');

// Serve uploaded files (logos)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Mount routes
app.use('/api/realtime', realtimeRouter);
app.use('/api/auth', authRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/players', playersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/pos', posRouter);
app.use('/api/billing', billingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/system', systemRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/settings', settingsRouter);

// Database connection sanity check
pool.getConnection()
  .then(async conn => {
    console.log('Connected to MySQL');

    await migrate(conn);

    conn.release();

    // Initialize WhatsApp Web client on startup
    initializeWhatsApp();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    console.error('Please verify that MySQL service is running and credentials in .env are correct.');
  });

// Background loops

// 1. Auto-Lock / Auto-Pause Checker Loop
setInterval(async () => {
  try {
    const now = pool.getDbNow();
    
    // A. Query active prepaid sessions that have expired
    const [expiredPrepaid] = await pool.query(
      `SELECT s.id, s.station_id, st.name AS station_name, s.player_id, p.name AS player_name 
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       LEFT JOIN players p ON s.player_id = p.id
       WHERE s.status = 'Active' AND s.session_type = 'Prepaid' AND s.target_end_time <= NOW()`
    );

    for (const session of expiredPrepaid) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Update session
        await conn.query(
          "UPDATE game_sessions SET status = 'Completed', end_time = target_end_time WHERE id = ?",
          [session.id]
        );

        // Make station available
        await conn.query(
          "UPDATE stations SET status = 'Available' WHERE id = ?",
          [session.station_id]
        );

        // Log audit
        await conn.query(
          "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
          [1, 'Session Auto-Lock', `Auto-locked station ${session.station_name} for session ID: ${session.id}. Prepaid time expired.`]
        );

        await conn.commit();

        console.log(`[Auto-Lock] Station ${session.station_name} locked. Session completed.`);

        // Broadcast to clients
        broadcast('station_update', { id: session.station_id, name: session.station_name, status: 'Available' });
        broadcast('activity_feed', {
          timestamp: new Date().toISOString(),
          userId: 1,
          action: 'Session Auto-Lock',
          details: `Auto-locked station ${session.station_name} for session ID: ${session.id}. Prepaid time expired.`
        });
        broadcast('timer_ended', {
          sessionId: session.id,
          stationId: session.station_id,
          stationName: session.station_name,
          playerName: session.player_name || 'Walk-in',
          sessionType: 'Prepaid'
        });

      } catch (err) {
        await conn.rollback();
        console.error('[Auto-Lock Error] Transaction failed:', err);
      } finally {
        conn.release();
      }
    }

    // B. Query active postpaid sessions that have expired
    const [expiredPostpaid] = await pool.query(
      `SELECT s.id, s.station_id, st.name AS station_name, s.player_id, p.name AS player_name 
       FROM game_sessions s 
       JOIN stations st ON s.station_id = st.id 
       LEFT JOIN players p ON s.player_id = p.id
       WHERE s.status = 'Active' AND s.session_type = 'Postpaid' AND s.target_end_time <= NOW()`
    );

    for (const session of expiredPostpaid) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Update session status to Paused so billing stops accumulating cost
        await conn.query(
          "UPDATE game_sessions SET status = 'Paused', pause_time = NOW() WHERE id = ?",
          [session.id]
        );

        // Log audit
        await conn.query(
          "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
          [1, 'Session Auto-Pause', `Auto-paused postpaid station ${session.station_name} for session ID: ${session.id}. Target limit reached.`]
        );

        await conn.commit();

        console.log(`[Auto-Pause] Station ${session.station_name} paused. Postpaid limit reached.`);

        // Broadcast to clients (station is still occupied but paused)
        broadcast('station_update', { id: session.station_id, name: session.station_name, status: 'Occupied' });
        broadcast('activity_feed', {
          timestamp: new Date().toISOString(),
          userId: 1,
          action: 'Session Auto-Pause',
          details: `Auto-paused postpaid station ${session.station_name} for session ID: ${session.id}. Target limit reached.`
        });
        broadcast('timer_ended', {
          sessionId: session.id,
          stationId: session.station_id,
          stationName: session.station_name,
          playerName: session.player_name || 'Walk-in',
          sessionType: 'Postpaid'
        });

      } catch (err) {
        await conn.rollback();
        console.error('[Auto-Pause Error] Transaction failed:', err);
      } finally {
        conn.release();
      }
    }
  } catch (err) {
    console.error('[Auto-Lock/Pause Error] Outer query failed:', err);
  }
}, 1000);

// 2. Active Session Countdown / Count-up SSE Ticker Loop
setInterval(async () => {
  try {
    // Select active and paused sessions with station details
    const [activeSessions] = await pool.query(`
      SELECT s.id, s.station_id, st.name AS station_name, st.type AS station_type, 
             s.session_type, s.start_time, s.target_end_time, s.pause_time, 
             s.paused_duration_seconds, s.status, s.hourly_rate
      FROM game_sessions s
      JOIN stations st ON s.station_id = st.id
      WHERE s.status IN ('Active', 'Paused')
    `);

    const now = pool.getDbNow();
    const sessionUpdates = activeSessions.map(session => {
      let secondsLeft = null;
      let secondsElapsed = 0;
      let gameCost = parseFloat(session.total_cost || 0);

      const startTime = new Date(session.start_time);
      const activeEndTime = session.status === 'Paused' ? new Date(session.pause_time) : now;
      
      // Calculate elapsed time (excluding pause time)
      const pausedSecs = parseInt(session.paused_duration_seconds || 0, 10);
      secondsElapsed = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - pausedSecs);

      const hasLimit = session.target_end_time ? true : false;
      if (hasLimit) {
        const target = new Date(session.target_end_time);
        if (session.status === 'Paused') {
          // While paused, time left is frozen based on pause_time
          const pauseInstant = new Date(session.pause_time);
          secondsLeft = Math.max(0, Math.floor((target - pauseInstant) / 1000));
        } else {
          secondsLeft = Math.max(0, Math.floor((target - now) / 1000));
        }
      }

      if (session.session_type === 'Postpaid') {
        if (session.target_end_time) {
          const targetEndTime = new Date(session.target_end_time);
          const totalPurchasedSeconds = Math.max(0, Math.floor((targetEndTime - startTime) / 1000) - pausedSecs);
          gameCost = parseFloat(((totalPurchasedSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
        } else {
          const billingSeconds = Math.max(900, secondsElapsed);
          gameCost = parseFloat(((billingSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
        }
      }

      return {
        id: session.id,
        station_id: session.station_id,
        station_name: session.station_name,
        session_type: session.session_type,
        status: session.status,
        seconds_left: secondsLeft,
        seconds_elapsed: secondsElapsed,
        game_cost: gameCost,
        has_limit: hasLimit
      };
    });

    // Broadcast ticking updates to active dashboards
    if (sessionUpdates.length > 0) {
      broadcast('session_tick', sessionUpdates);
    }
  } catch (err) {
    console.error('[SSE Ticker Error]:', err);
  }
}, 1000);


async function migrate(conn) {
  const queries = [
    "ALTER TABLE `game_sessions` ADD COLUMN `payment_method` VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE `stations` MODIFY COLUMN `type` ENUM('PC', 'PS5', 'Xbox', 'VR', 'Pool', 'Other', 'Dining', 'PS4') NOT NULL",
    "ALTER TABLE `pricing_rules` MODIFY COLUMN `station_type` ENUM('PC', 'PS5', 'Xbox', 'VR', 'Pool', 'Other', 'Dining', 'PS4') NOT NULL",
    "INSERT IGNORE INTO `pricing_rules` (station_type, hourly_rate, controller_addon_rate) VALUES ('Dining', 0.00, 0.00)",
    "INSERT IGNORE INTO `pricing_rules` (station_type, hourly_rate, controller_addon_rate) VALUES ('Pool', 8.00, 0.00)",
    "INSERT IGNORE INTO `pricing_rules` (station_type, hourly_rate, controller_addon_rate) VALUES ('PS4', 5.00, 2.00)",
    "INSERT IGNORE INTO `inventory` (id, name, type, price, stock_qty, low_stock_threshold) VALUES (999, 'Console Session Charge', 'Other', 0.00, 99999, 0)",
    "ALTER TABLE `pos_sales` ADD COLUMN `merged_from_session_id` INT DEFAULT NULL",
    "ALTER TABLE `game_sessions` ADD COLUMN `linked_session_id` INT DEFAULT NULL",
    "INSERT IGNORE INTO `inventory` (id, name, type, price, stock_qty, low_stock_threshold) VALUES (1000, 'Dining Table Charge', 'Other', 0.00, 99999, 0)"
  ];

  for (const q of queries) {
    try { await conn.query(q); } catch (_) {}
  }

  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS \`categories\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(50) NOT NULL UNIQUE,
      \`icon\` VARCHAR(10) NOT NULL DEFAULT '📦',
      \`display_order\` INT NOT NULL DEFAULT 0,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (_) {}

  try { await conn.query("ALTER TABLE `inventory` ADD COLUMN `category_id` INT DEFAULT NULL"); } catch (_) {}
  try { await conn.query("ALTER TABLE `inventory` ADD CONSTRAINT `fk_inventory_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL"); } catch (_) {}

  try {
    const [rows] = await conn.query("SELECT COUNT(*) as count FROM `categories`");
    if (rows[0].count === 0) {
      await conn.query(`INSERT INTO \`categories\` (\`name\`, \`icon\`, \`display_order\`) VALUES
        ('Snacks', '🍿', 1), ('Beverage', '🥤', 2), ('Coffee', '☕', 3),
        ('Meals', '🍜', 4), ('Merchandise', '👕', 5), ('Other', '📦', 6)`);
    }
  } catch (_) {}

  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS \`whatsapp_queue\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`to_phone\` VARCHAR(25) NOT NULL,
      \`message_type\` ENUM('text', 'pdf_invoice') NOT NULL,
      \`message_body\` LONGTEXT,
      \`pdf_filename\` VARCHAR(100) DEFAULT NULL,
      \`caption\` TEXT DEFAULT NULL,
      \`status\` ENUM('pending', 'sending', 'sent', 'failed') DEFAULT 'pending',
      \`error_message\` TEXT DEFAULT NULL,
      \`attempts\` INT DEFAULT 0,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`processed_at\` TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (_) {}

  try {
    const [dc] = await conn.query("SHOW COLUMNS FROM `stations` LIKE 'is_deleted'");
    if (dc.length === 0) {
      await conn.query("ALTER TABLE `stations` ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0");
      await conn.query("ALTER TABLE `stations` ADD INDEX `idx_is_deleted` (`is_deleted`)");
    }
  } catch (_) {}

  try {
    const [st] = await conn.query("SHOW TABLES LIKE 'system_settings'");
    if (st.length === 0) {
      await conn.query(`CREATE TABLE \`system_settings\` (
        \`setting_key\` VARCHAR(50) NOT NULL PRIMARY KEY,
        \`setting_value\` TEXT DEFAULT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      await conn.query(`INSERT INTO \`system_settings\` (\`setting_key\`, \`setting_value\`) VALUES
        ('whatsapp_enabled', 'false'),
        ('enabled_station_types', '["PC","PS5","Xbox","VR","Pool","Dining","Other","PS4"]'),
        ('whatsapp_pacing_min', '7'),
        ('whatsapp_pacing_max', '15')`);
    }
  } catch (_) {}

  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS \`shift_logs\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT NOT NULL,
      \`check_in\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`check_out\` TIMESTAMP NULL DEFAULT NULL,
      \`opening_cash\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      \`closing_cash\` DECIMAL(10,2) DEFAULT NULL,
      \`status\` ENUM('Open', 'Closed') NOT NULL DEFAULT 'Open',
      FOREIGN KEY (\`user_id\`) REFERENCES \`users_admin\`(\`id\`) ON DELETE CASCADE,
      INDEX \`idx_user_id\` (\`user_id\`),
      INDEX \`idx_status\` (\`status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (_) {}

  try {
    const [fk] = await conn.query(
      "SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'pos_sale_items' AND REFERENCED_TABLE_NAME = 'inventory' AND DELETE_RULE = 'CASCADE'",
      [process.env.DB_NAME || 'gaming_zone']
    );
    if (fk.length > 0) {
      await conn.query(`ALTER TABLE \`pos_sale_items\` DROP FOREIGN KEY \`${fk[0].CONSTRAINT_NAME}\``);
      await conn.query(`ALTER TABLE \`pos_sale_items\` ADD CONSTRAINT \`${fk[0].CONSTRAINT_NAME}\` FOREIGN KEY (\`item_id\`) REFERENCES \`inventory\`(\`id\`) ON DELETE RESTRICT`);
    }
  } catch (_) {}

  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM `players` LIKE 'wallet_balance'");
    if (cols.length > 0) await conn.query("ALTER TABLE `players` CHANGE COLUMN `wallet_balance` `play_hours` DECIMAL(10,2) NOT NULL DEFAULT 0.00");
  } catch (_) {}

  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM `pos_sales` LIKE 'wallet_amount'");
    if (cols.length > 0) await conn.query("ALTER TABLE `pos_sales` CHANGE COLUMN `wallet_amount` `play_hours_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00");
  } catch (_) {}

  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM `pos_sales` LIKE 'payment_method'");
    if (cols.length > 0 && cols[0].Type.includes('Wallet')) {
      await conn.query("ALTER TABLE `pos_sales` MODIFY COLUMN `payment_method` VARCHAR(50) NOT NULL");
      await conn.query("UPDATE `pos_sales` SET `payment_method` = 'PlayHours' WHERE `payment_method` = 'Wallet'");
      await conn.query("ALTER TABLE `pos_sales` MODIFY COLUMN `payment_method` ENUM('Cash', 'PlayHours', 'Card', 'Split') NOT NULL");
    }
  } catch (_) {}

  try { await conn.query("UPDATE `game_sessions` SET `payment_method` = 'PlayHours' WHERE `payment_method` = 'Wallet'"); } catch (_) {}

  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM `pos_sales` LIKE 'payment_intent_id'");
    if (cols.length === 0) {
      await conn.query("ALTER TABLE `pos_sales` ADD COLUMN `payment_intent_id` VARCHAR(255) DEFAULT NULL, ADD COLUMN `transaction_id` VARCHAR(255) DEFAULT NULL");
    }
  } catch (_) {}

  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM `game_sessions` LIKE 'payment_intent_id'");
    if (cols.length === 0) {
      await conn.query("ALTER TABLE `game_sessions` ADD COLUMN `payment_intent_id` VARCHAR(255) DEFAULT NULL, ADD COLUMN `transaction_id` VARCHAR(255) DEFAULT NULL");
    }
  } catch (_) {}
}

// Start server
app.listen(PORT, () => {
  console.log(`Gaming Zone Express Server running on port ${PORT}`);
});
