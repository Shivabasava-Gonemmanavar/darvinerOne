import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'server/.env' });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'workflow_hr',
  user: process.env.DB_USER || 'workflow_hr_app',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
  dateStrings: ['DATE']
});

export async function audit(actorId, action, entityType, entityId = null, details = null) {
  await pool.execute(
    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    [actorId || null, action, entityType, entityId == null ? null : String(entityId), details ? JSON.stringify(details) : null]
  );
}
