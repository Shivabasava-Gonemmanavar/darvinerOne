import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });
const pool = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_ADMIN_USER || process.env.DB_USER || 'root',
  password: process.env.DB_ADMIN_PASSWORD || process.env.DB_PASSWORD || '',
  multipleStatements: false
});

try {
  const sql = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const statements = sql.split(';').map((part) => part.trim()).filter(Boolean);
  for (const statement of statements) await pool.query(statement);
  console.log('Database schema is ready.');
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
