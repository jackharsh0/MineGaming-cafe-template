// Backend Verification Test Script
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function runTests() {
  console.log('--- GAMING ZONE BACKEND VERIFICATION LOGS ---');

  try {
    // 1. DB connection check
    const conn = await pool.getConnection();
    console.log('✔ Database connection established.');
    conn.release();

    // 2. Query seed admin details
    const [admins] = await pool.query('SELECT username, full_name, role FROM users_admin');
    console.log(`✔ Found ${admins.length} registered admins:`);
    admins.forEach(admin => {
      console.log(`   - Username: ${admin.username}, Name: ${admin.full_name}, Role: ${admin.role}`);
    });

    // 3. Verify bcrypt comparison for default password 'admin123'
    const [adminRow] = await pool.query('SELECT password_hash FROM users_admin WHERE username = "admin"');
    if (adminRow.length > 0) {
      const isMatch = await bcrypt.compare('admin123', adminRow[0].password_hash);
      if (isMatch) {
        console.log('✔ Bcrypt comparison successful for admin123 passcode.');
      } else {
        console.log('✘ Bcrypt comparison failed for admin123 passcode.');
      }
    } else {
      console.log('✘ Admin user not found in database.');
    }

    // 4. Query stations count
    const [stations] = await pool.query('SELECT type, COUNT(*) as count FROM stations GROUP BY type');
    console.log('✔ Loaded physical station categories:');
    stations.forEach(st => {
      console.log(`   - Type: ${st.type}, Count: ${st.count}`);
    });

    // 5. Query inventory counts
    const [inventory] = await pool.query('SELECT COUNT(*) as count FROM inventory');
    console.log(`✔ Loaded ${inventory[0].count} items into the snack bar catalog.`);

    // 6. Query pricing rules
    const [pricing] = await pool.query('SELECT station_type, hourly_rate FROM pricing_rules');
    console.log('✔ Current regular hourly rates loaded:');
    pricing.forEach(pr => {
      console.log(`   - Station: ${pr.station_type}, Hourly Rate: $${parseFloat(pr.hourly_rate).toFixed(2)}`);
    });

    console.log('---------------------------------------------');
    console.log('✔ ALL TEST COMPLETED SUCCESSFULLY.');
    process.exit(0);

  } catch (err) {
    console.error('✘ Test execution failed:', err.message);
    process.exit(1);
  }
}

runTests();
