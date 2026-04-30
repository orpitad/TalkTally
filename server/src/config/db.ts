import { Pool } from 'pg';

// Only load .env file in local development
// On Railway, variables are injected directly into process.env
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config();
}

console.log('DB Config:', {
  host:           process.env.PGHOST,
  port:           process.env.PGPORT,
  database:       process.env.PGDATABASE,
  user:           process.env.PGUSER,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  nodeEnv:        process.env.NODE_ENV,
});

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
    });

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