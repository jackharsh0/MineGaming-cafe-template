const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function resetPasswords() {
  console.log('--- REGENERATING BCRYPT PASSWORDS ---');
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const attendantHash = await bcrypt.hash('attendant123', 10);

    console.log('New hashes generated:');
    console.log(`- admin123: ${adminHash}`);
    console.log(`- manager123: ${managerHash}`);
    console.log(`- attendant123: ${attendantHash}`);

    await pool.query('UPDATE users_admin SET password_hash = ? WHERE username = "admin"', [adminHash]);
    await pool.query('UPDATE users_admin SET password_hash = ? WHERE username = "manager"', [managerHash]);
    await pool.query('UPDATE users_admin SET password_hash = ? WHERE username = "attendant"', [attendantHash]);

    console.log('✔ Passwords updated in database successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetPasswords();
