// Database Index Optimization Script
const pool = require('./config/db');

async function runOptimization() {
  console.log('--- STARTING DATABASE INDEX OPTIMIZATION ---');
  
  const indexes = [
    { table: 'game_sessions', name: 'idx_sessions_player_id', column: 'player_id' },
    { table: 'game_sessions', name: 'idx_sessions_station_id', column: 'station_id' },
    { table: 'pos_sales', name: 'idx_sales_player_id', column: 'player_id' },
    { table: 'pos_sales', name: 'idx_sales_session_id', column: 'session_id' },
    { table: 'pos_sales', name: 'idx_sales_created_at', column: 'created_at' },
    { table: 'pos_sale_items', name: 'idx_sale_items_sale_id', column: 'sale_id' },
    { table: 'pos_sale_items', name: 'idx_sale_items_item_id', column: 'item_id' },
    { table: 'appointments', name: 'idx_appointments_station_id', column: 'station_id' },
    { table: 'audit_logs', name: 'idx_audit_logs_user_id', column: 'user_id' },
    { table: 'audit_logs', name: 'idx_audit_logs_timestamp', column: 'timestamp' }
  ];

  const conn = await pool.getConnection();
  try {
    for (const idx of indexes) {
      try {
        console.log(`Adding index ${idx.name} on ${idx.table}(${idx.column})...`);
        await conn.query(`ALTER TABLE \`${idx.table}\` ADD INDEX \`${idx.name}\` (\`${idx.column}\`)`);
        console.log(`✔ Success.`);
      } catch (err) {
        if (err.errno === 1061) {
          console.log(`ℹ Index already exists, skipping.`);
        } else {
          console.error(`✘ Failed: ${err.message}`);
        }
      }
    }
    console.log('--- DATABASE OPTIMIZATION COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runOptimization();
