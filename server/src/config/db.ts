import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Railway injects this automatically
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Run schema on startup — idempotent (safe to run multiple times)
export const initDb = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        device_id   TEXT NOT NULL UNIQUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id            SERIAL PRIMARY KEY,
        device_id     TEXT NOT NULL,
        accuracy      INTEGER NOT NULL,
        total_steps   INTEGER NOT NULL,
        completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_device FOREIGN KEY (device_id)
          REFERENCES users (device_id)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_device_id
        ON sessions (device_id);
    `);
    console.log('✅ Database schema ready');
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err);
    throw err;
  }
};