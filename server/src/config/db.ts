import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Log what Railway is injecting so we can debug connection issues
console.log('DB Config:', {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
});

// Use DATABASE_URL if available (Railway injects this), 
// otherwise fall back to individual variables for local dev
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host:     process.env.PGHOST     || 'localhost',
      port:     Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'talktally',
      user:     process.env.PGUSER     || 'postgres',
      password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
      ssl: false,
    });

// Run schema on startup — idempotent, safe to run multiple times
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