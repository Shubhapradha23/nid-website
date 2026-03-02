/**
 * Initialize MySQL database and tables for NID Website
 * Run: npm run init-db
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DISCIPLINES = [
  { code: 'textile_design', name: 'Textile design' },
  { code: 'product_design', name: 'Product design' },
  { code: 'glass_ceramics_design', name: 'Glass and ceramics design' },
  { code: 'furniture_interior_design', name: 'Furniture and interior design' },
  { code: 'film_video_communication', name: 'Film and video communication' },
  { code: 'graphic_design', name: 'Graphic design' },
  { code: 'animation', name: 'Animation' },
  { code: 'exhibition_design', name: 'Exhibition design' }
];

async function init() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL.');

    const dbName = process.env.DB_NAME || 'nid_website';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log(`Using database: ${dbName}`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schema);
    console.log('Tables created successfully.');

    // Insert disciplines if not exists
    for (const d of DISCIPLINES) {
      await connection.query(
        `INSERT IGNORE INTO disciplines (code, name) VALUES (?, ?)`,
        [d.code, d.name]
      );
    }

    console.log('Database initialization complete.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

init();
