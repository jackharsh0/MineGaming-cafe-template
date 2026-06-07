// Database Schema Importer
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function importSchema() {
  console.log('--- GAMING ZONE DATABASE IMPORTER ---');
  console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Database: ${process.env.DB_NAME}`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
      database: process.env.DB_NAME || 'gaming_zone',
      multipleStatements: true // Allow executing batch SQL
    });

    console.log('✔ Connected to database server.');

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    let sqlText = fs.readFileSync(schemaPath, 'utf8');

    // Strip out CREATE DATABASE and USE statements to ensure it imports into the user's specific database (e.g. tmnrgglmsa_game)
    sqlText = sqlText.replace(/CREATE DATABASE[\s\S]*?;/i, '');
    sqlText = sqlText.replace(/USE[\s\S]*?;/i, '');

    console.log('⏳ Importing tables and seed data. Please wait...');
    
    // Execute SQL script
    await connection.query(sqlText);
    
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
