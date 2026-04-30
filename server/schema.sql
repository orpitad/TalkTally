-- Run this file once against your PostgreSQL database:
--   psql -U postgres -d talktally -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  device_id   TEXT NOT NULL UNIQUE,   -- anonymous device identifier from the app
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              SERIAL PRIMARY KEY,
  device_id       TEXT NOT NULL,              -- matches users.device_id
  accuracy        INTEGER NOT NULL,           -- 0-100 percentage
  total_steps     INTEGER NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_device FOREIGN KEY (device_id)
    REFERENCES users (device_id)
    ON DELETE CASCADE
);

-- Index for fast history lookups per device
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions (device_id);