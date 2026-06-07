const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Get Live Revenue Tracker, Occupancy Rate and counts
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Gross revenue today (completed sessions + paid direct sales)
    const [sessionRev] = await pool.query(
      'SELECT SUM(total_cost) AS total FROM game_sessions WHERE status = "Completed" AND DATE(end_time) = ?',
      [today]
    );
    const [posRev] = await pool.query(
      'SELECT SUM(total) AS total FROM pos_sales WHERE status = "Paid" AND DATE(created_at) = ? AND sale_type = "Direct"',
      [today]
    );

    const grossRevenue = parseFloat(sessionRev[0].total || 0) + parseFloat(posRev[0].total || 0);

    // 2. Occupancy rate (% of stations currently occupied)
    const [totalStations] = await pool.query('SELECT COUNT(*) AS count FROM stations WHERE status != "Maintenance" AND is_deleted = 0');
    const [occupiedStations] = await pool.query('SELECT COUNT(*) AS count FROM stations WHERE status = "Occupied" AND is_deleted = 0');

    const totalCount = totalStations[0].count;
    const occupiedCount = occupiedStations[0].count;
    const occupancyRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

    // 3. Low stock count
    const [lowStock] = await pool.query('SELECT COUNT(*) AS count FROM inventory WHERE stock_qty <= low_stock_threshold');

    res.json({
      success: true,
      summary: {
        gross_revenue: grossRevenue,
        occupancy_rate: occupancyRate,
        total_stations: totalCount,
        occupied_stations: occupiedCount,
        low_stock_count: lowStock[0].count
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get popular stations (usage metrics)
router.get('/popular-stations', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT st.name, st.type, COUNT(s.id) AS session_count, 
             IFNULL(SUM(TIMESTAMPDIFF(MINUTE, s.start_time, IFNULL(s.end_time, CURRENT_TIMESTAMP))), 0) AS total_minutes
      FROM stations st
      LEFT JOIN game_sessions s ON st.id = s.station_id
      WHERE st.is_deleted = 0
      GROUP BY st.id
      ORDER BY total_minutes DESC
    `);
    res.json({ success: true, metrics: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Peak hour occupancy tracker (Heatmap visualization data)
router.get('/peak-hours', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT HOUR(start_time) AS hour_of_day, COUNT(id) AS session_count
      FROM game_sessions
      WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY HOUR(start_time)
      ORDER BY hour_of_day
    `);
    
    // Fill in 24 hours
    const heatmap = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    rows.forEach(row => {
      heatmap[row.hour_of_day].count = row.session_count;
    });

    res.json({ success: true, heatmap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Compile Daily Financial Report data
router.get('/report', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // 1. Session Billing Summary
    const [sessions] = await pool.query(
      `SELECT COUNT(*) AS count, SUM(total_cost) AS total, SUM(discount_applied) AS discount, SUM(tax_applied) AS tax
       FROM game_sessions 
       WHERE status = 'Completed' AND DATE(end_time) = ?`,
      [targetDate]
    );

    // 2. POS Sales Summary
    const [pos] = await pool.query(
      `SELECT COUNT(*) AS count, SUM(total) AS total, SUM(discount) AS discount, SUM(tax) AS tax
       FROM pos_sales 
       WHERE status = 'Paid' AND DATE(created_at) = ?`,
      [targetDate]
    );

    // 3. Shift logs for the day
    const [shifts] = await pool.query(
      `SELECT s.*, u.full_name AS staff_name 
       FROM shift_logs s
       JOIN users_admin u ON s.user_id = u.id
       WHERE DATE(s.check_in) = ?`,
      [targetDate]
    );

    res.json({
      success: true,
      report: {
        date: targetDate,
        game_sessions: {
          count: sessions[0].count || 0,
          total_revenue: parseFloat(sessions[0].total || 0),
          discount: parseFloat(sessions[0].discount || 0),
          tax: parseFloat(sessions[0].tax || 0)
        },
        pos_sales: {
          count: pos[0].count || 0,
          total_revenue: parseFloat(pos[0].total || 0),
          discount: parseFloat(pos[0].discount || 0),
          tax: parseFloat(pos[0].tax || 0)
        },
        shifts: shifts.map(s => ({
          staff: s.staff_name,
          check_in: s.check_in,
          check_out: s.check_out,
          opening_cash: parseFloat(s.opening_cash),
          closing_cash: s.closing_cash ? parseFloat(s.closing_cash) : null,
          status: s.status
        }))
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get detailed revenue statistics (daily, weekly, monthly), graph trend data, and transaction logs
router.get('/revenue-details', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  try {
    // 1. Daily, Weekly, and Monthly totals
    const [dailyRows] = await pool.query(`
      SELECT SUM(amount) AS total FROM (
        SELECT total_cost AS amount FROM game_sessions WHERE status = 'Completed' AND DATE(end_time) = CURDATE()
        UNION ALL
        SELECT total AS amount FROM pos_sales WHERE status = 'Paid' AND sale_type = 'Direct' AND DATE(created_at) = CURDATE()
      ) t
    `);

    const [weeklyRows] = await pool.query(`
      SELECT SUM(amount) AS total FROM (
        SELECT total_cost AS amount FROM game_sessions WHERE status = 'Completed' AND end_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT total AS amount FROM pos_sales WHERE status = 'Paid' AND sale_type = 'Direct' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ) t
    `);

    const [monthlyRows] = await pool.query(`
      SELECT SUM(amount) AS total FROM (
        SELECT total_cost AS amount FROM game_sessions WHERE status = 'Completed' AND end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION ALL
        SELECT total AS amount FROM pos_sales WHERE status = 'Paid' AND sale_type = 'Direct' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) t
    `);

    // 2. Graph data: last 14 days of revenue
    const [graphRows] = await pool.query(`
      SELECT date, SUM(amount) AS total FROM (
        SELECT DATE(end_time) AS date, total_cost AS amount FROM game_sessions WHERE status = 'Completed' AND end_time >= DATE_SUB(NOW(), INTERVAL 14 DAY)
        UNION ALL
        SELECT DATE(created_at) AS date, total AS amount FROM pos_sales WHERE status = 'Paid' AND sale_type = 'Direct' AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      ) t
      GROUP BY date
      ORDER BY date ASC
    `);

    // 3. Transactions list: last 100 payments
    const [transactionRows] = await pool.query(`
      SELECT * FROM (
        SELECT 
          'Game Session' AS type,
          s.id AS ref_id,
          s.end_time AS timestamp,
          IFNULL(p.name, 'Guest Walk-in') AS customer_name,
          s.total_cost AS amount,
          IFNULL(s.payment_method, 'Cash') AS payment_method
        FROM game_sessions s
        LEFT JOIN players p ON s.player_id = p.id
        WHERE s.status = 'Completed'

        UNION ALL

        SELECT 
          'Cafe/Prepaid' AS type,
          ps.id AS ref_id,
          ps.created_at AS timestamp,
          IFNULL(p.name, 'Guest Walk-in') AS customer_name,
          ps.total AS amount,
          ps.payment_method AS payment_method
        FROM pos_sales ps
        LEFT JOIN players p ON ps.player_id = p.id
        WHERE ps.status = 'Paid' AND ps.sale_type = 'Direct'
      ) t
      ORDER BY timestamp DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: {
        revenue: {
          daily: parseFloat(dailyRows[0].total || 0),
          weekly: parseFloat(weeklyRows[0].total || 0),
          monthly: parseFloat(monthlyRows[0].total || 0)
        },
        graph: graphRows.map(r => ({
          date: new Date(r.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          total: parseFloat(r.total || 0)
        })),
        transactions: transactionRows.map(t => ({
          type: t.type,
          ref_id: t.ref_id,
          timestamp: t.timestamp,
          customer_name: t.customer_name,
          amount: parseFloat(t.amount || 0),
          payment_method: t.payment_method
        }))
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get detailed receipt data for a transaction
router.get('/receipt/:type/:refId', verifyToken, requireRole(['SuperAdmin', 'Manager']), async (req, res) => {
  const { type, refId } = req.params;

  try {
    if (type === 'Game Session') {
      // 1. Fetch game session details
      const [sessions] = await pool.query(`
        SELECT s.*, st.name AS station_name, st.type AS station_type, 
               p.name AS player_name, p.phone AS player_phone, p.loyalty_tier, 
               u.full_name AS staff_name
        FROM game_sessions s
        JOIN stations st ON s.station_id = st.id
        LEFT JOIN players p ON s.player_id = p.id
        LEFT JOIN users_admin u ON s.created_by = u.id
        WHERE s.id = ?
      `, [refId]);

      if (sessions.length === 0) {
        return res.status(404).json({ success: false, message: 'Game session not found' });
      }

      const session = sessions[0];

      // 2. Fetch linked paid POS sales items
      const [posItems] = await pool.query(`
        SELECT psi.quantity, psi.unit_price, psi.total_price, i.name AS item_name
        FROM pos_sale_items psi
        JOIN pos_sales ps ON psi.sale_id = ps.id
        JOIN inventory i ON psi.item_id = i.id
        WHERE ps.session_id = ? AND ps.status = 'Paid'
      `, [refId]);

      let cafeCost = 0;
      const parsedItems = posItems.map(item => {
        const itemTotal = parseFloat(item.total_price || 0);
        cafeCost += itemTotal;
        return {
          name: item.item_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price || 0),
          total_price: itemTotal
        };
      });

      // Calculate elapsed minutes
      const start = new Date(session.start_time);
      const end = new Date(session.end_time || session.start_time);
      const elapsedSeconds = Math.max(0, Math.floor((end - start) / 1000) - session.paused_duration_seconds);
      const elapsedMinutes = Math.ceil(elapsedSeconds / 60);

      // Reconstruct game cost: game_cost = total - cafe_cost + discount - tax
      let gameCost = parseFloat(session.total_cost || 0) - cafeCost + parseFloat(session.discount_applied || 0) - parseFloat(session.tax_applied || 0);
      if (gameCost < 0) {
        gameCost = session.session_type === 'Prepaid' ? parseFloat(session.total_cost || 0) : 0;
      }

      res.json({
        success: true,
        receipt: {
          type: 'Game Session',
          ref_id: session.id,
          timestamp: session.end_time || session.start_time,
          customer_name: session.player_name || 'Guest Walk-in',
          customer_phone: session.player_phone || 'N/A',
          customer_tier: session.loyalty_tier || 'Bronze',
          staff_name: session.staff_name || 'System Auto-Lock',
          payment_method: session.payment_method || 'Cash',
          
          // Detailed game stats
          session_type: session.session_type,
          station_name: session.station_name,
          station_type: session.station_type,
          hourly_rate: parseFloat(session.hourly_rate || 0),
          controller_count: session.controller_count,
          elapsed_minutes: elapsedMinutes,
          paused_seconds: session.paused_duration_seconds,
          start_time: session.start_time,
          end_time: session.end_time,

          // Breakdown
          game_cost: parseFloat(gameCost.toFixed(2)),
          cafe_cost: parseFloat(cafeCost.toFixed(2)),
          items: parsedItems,
          subtotal: parseFloat((gameCost + cafeCost).toFixed(2)),
          discount: parseFloat(parseFloat(session.discount_applied || 0).toFixed(2)),
          tax: parseFloat(parseFloat(session.tax_applied || 0).toFixed(2)),
          total: parseFloat(parseFloat(session.total_cost || 0).toFixed(2))
        }
      });

    } else if (type === 'Cafe/Prepaid') {
      // 1. Fetch POS Sale details
      const [sales] = await pool.query(`
        SELECT ps.*, p.name AS player_name, p.phone AS player_phone, p.loyalty_tier,
               u.full_name AS staff_name
        FROM pos_sales ps
        LEFT JOIN players p ON ps.player_id = p.id
        LEFT JOIN users_admin u ON ps.created_by = u.id
        WHERE ps.id = ?
      `, [refId]);

      if (sales.length === 0) {
        return res.status(404).json({ success: false, message: 'POS sale not found' });
      }

      const sale = sales[0];

      // 2. Fetch POS items
      const [posItems] = await pool.query(`
        SELECT psi.quantity, psi.unit_price, psi.total_price, i.name AS item_name
        FROM pos_sale_items psi
        JOIN inventory i ON psi.item_id = i.id
        WHERE psi.sale_id = ?
      `, [refId]);

      const parsedItems = posItems.map(item => ({
        name: item.item_name,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price || 0),
        total_price: parseFloat(item.total_price || 0)
      }));

      res.json({
        success: true,
        receipt: {
          type: 'Cafe/Prepaid',
          ref_id: sale.id,
          timestamp: sale.created_at,
          customer_name: sale.player_name || 'Guest Walk-in',
          customer_phone: sale.player_phone || 'N/A',
          customer_tier: sale.loyalty_tier || 'N/A',
          staff_name: sale.staff_name || 'System Admin',
          payment_method: sale.payment_method || 'Cash',

          // Breakdown
          game_cost: 0.00,
          cafe_cost: parseFloat(sale.subtotal || 0),
          items: parsedItems,
          subtotal: parseFloat(sale.subtotal || 0),
          discount: parseFloat(sale.discount || 0),
          tax: parseFloat(sale.tax || 0),
          total: parseFloat(sale.total || 0)
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
