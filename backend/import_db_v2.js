const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function importSchema() {
  console.log('--- GAMING ZONE DATABASE IMPORTER V2 ---');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    console.log('✔ Connected to database.');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const sqlText = fs.readFileSync(schemaPath, 'utf8');

    // Split queries by semicolon (taking care of comments and multi-lines)
    const lines = sqlText.split('\n');
    let queries = [];
    let currentQuery = '';

    for (let line of lines) {
      // Clean up line
      const cleanLine = line.trim();
      
      // Skip comments or empty lines
      if (cleanLine.startsWith('--') || cleanLine.startsWith('/*') || cleanLine === '') {
        continue;
      }

      currentQuery += ' ' + line;

      // If line ends with semicolon, push to queries list
      if (cleanLine.endsWith(';')) {
        queries.push(currentQuery.trim());
        currentQuery = '';
      }
    }

    console.log(`Parsed ${queries.length} SQL queries to execute.`);

    for (let i = 0; i < queries.length; i++) {
      let q = queries[i];
      
      // Skip database switches
      if (q.toUpperCase().startsWith('CREATE DATABASE') || q.toUpperCase().startsWith('USE')) {
        console.log(`[Skip] Database setup command: ${q.slice(0, 40)}...`);
        continue;
      }

      try {
        console.log(`[Executing ${i+1}/${queries.length}]: ${q.slice(0, 50)}...`);
        await connection.query(q);
      } catch (err) {
        console.error(`✘ Error executing query ${i+1}:`, err.message);
        console.error('Query was:', q);
        throw err;
      }
    }

    console.log('✔ Database imported successfully!');
    process.exit(0);

  } catch (err) {
    console.error('✘ Import failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

importSchema();
