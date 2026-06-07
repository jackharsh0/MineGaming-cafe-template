const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function checkPasswords() {
  console.log('--- PASSWORD CHECKER ---');
  try {
    const [rows] = await pool.query('SELECT username, password_hash FROM users_admin');
    for (const user of rows) {
      console.log(`Checking user: ${user.username}`);
      console.log(`Hash in DB: ${user.password_hash}`);
      
      const pwd = user.username + '123'; // e.g. admin123, manager123, attendant123
      const isMatch = await bcrypt.compare(pwd, user.password_hash);
      console.log(`Testing against "${pwd}": ${isMatch ? '✔ MATCH' : '✘ NO MATCH'}`);

      // Let's also check if it matches simple words
      const isSimpleMatch = await bcrypt.compare(user.username, user.password_hash);
      console.log(`Testing against "${user.username}": ${isSimpleMatch ? '✔ MATCH' : '✘ NO MATCH'}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPasswords();
