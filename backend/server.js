const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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

// Database connection sanity check
pool.getConnection()
  .then(async conn => {
    console.log('Connected to MySQL database gaming_zone');
    // Schema update: Add payment_method column to game_sessions if it doesn't exist
    try {
      await conn.query("ALTER TABLE `game_sessions` ADD COLUMN `payment_method` VARCHAR(50) DEFAULT NULL");
      console.log('Successfully ran schema migration: added payment_method to game_sessions');
    } catch (err) {
      // Ignore if column already exists
    }
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    console.error('Please verify that MySQL service is running and credentials in .env are correct.');
  });

// ==========================================
// BACKGROUND LOOPS (Auto-Lock & SSE Ticks)
// ==========================================

// 1. Auto-Lock / Auto-Pause Checker Loop
setInterval(async () => {
  try {
    const now = new Date();
    
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
}, 15000);

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

    const now = new Date();
    const sessionUpdates = activeSessions.map(session => {
      let secondsLeft = null;
      let secondsElapsed = 0;
      let gameCost = parseFloat(session.total_cost || 0);

      const startTime = new Date(session.start_time);
      const activeEndTime = session.status === 'Paused' ? new Date(session.pause_time) : now;
      
      // Calculate elapsed time (excluding pause time)
      secondsElapsed = Math.max(0, Math.floor((activeEndTime - startTime) / 1000) - session.paused_duration_seconds);

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
        // Postpaid cost increases dynamically
        // Enforce 15 min minimum billing
        const billingSeconds = Math.max(900, secondsElapsed);
        gameCost = parseFloat(((billingSeconds / 3600) * parseFloat(session.hourly_rate)).toFixed(2));
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
}, 8000);


// Start server
app.listen(PORT, () => {
  console.log(`Gaming Zone Express Server running on port ${PORT}`);
});
