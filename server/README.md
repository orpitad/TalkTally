# TalkTally Server

Express + TypeScript backend for TalkTally. Provides REST endpoints used by the mobile client (sessions ingestion & retrieval).

## Prerequisites
- Node.js 18+
- PostgreSQL (local dev) or a managed PostgreSQL (e.g., Railway)
- npm or yarn

## Install
```bash
cd server
npm install
# or
# yarn
```

## Environment
- Preferred: set DATABASE_URL for production.
- Alternatively set:
  - PGHOST
  - PGPORT
  - PGDATABASE
  - PGUSER
  - PGPASSWORD
- Other env vars:
  - NODE_ENV (development|production)
  - PORT (optional)
  - SENTRY_DSN (optional)
  - LOG_LEVEL (optional)

Example .env (development)
```
NODE_ENV=development
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=talktally
PGUSER=postgres
PGPASSWORD=postgres
```
(Do not commit .env to source control.)

## Database setup (local)
- Start Postgres (docker or local)
- The server's init script will attempt to create the minimal schema on startup (MVP). For production, use a migration tool (recommended).

## Run (development)
```bash
# start with auto-reload (ts-node-dev)
npm run dev
# script uses: ts-node-dev --respawn --transpile-only src/server.ts
```
The server listens on PORT (default 3000).

## Run (production build)
```bash
# build
npm run build
# start
npm start
```

## API endpoints (summary)
- GET /health
  - Returns { status: 'ok' }
- POST /sessions
  - Accepts session payload (deviceId, sessionNumber, totalSteps, correctSteps, optional metadata)
  - Returns created session metadata
- GET /sessions?deviceId=UUID[&limit=50&since=ISO_DATE]
  - Returns sessions for specified device

## DB Schema (MVP)
- users: id (serial), device_id (text unique), created_at (timestamp)
- sessions: id, device_id, session_number, accuracy, correct_steps, total_steps, duration_seconds, metadata JSONB, completed_at
- Index: idx_sessions_device_id (for fast lookups)

Notes:
- Server will create tables on startup for local dev, but production should use migrations (node-pg-migrate, Flyway, or similar).
- Always use parameterized queries to avoid SQL injection (pg library).

## Testing
- Add unit tests for controllers/services (Jest recommended).
- Integration tests should run against an ephemeral Postgres (Testcontainers or separate test DB).
- CI should run TypeScript checks, linting, and tests on PRs.

## Logging & Monitoring
- Structured logging in development; consider Sentry for errors and Datadog for metrics in production.
- Expose /health for uptime checks.

## Deployment
- Railway is supported and convenient (set DATABASE_URL in service env).
- Ensure NODE_ENV=production and correct DATABASE_URL in production environment.
- Use Railway/host-managed backups for Postgres.

## Common commands
- npm run dev — run with live reload (development)
- npm run build — compile TypeScript into dist
- npm start — run compiled server
- npm run lint — run ESLint
- npm test — run tests (if configured)

## Security & Best Practices
- Never commit credentials or .env.
- Enforce HTTPS in production.
- Validate all API inputs (Zod/Joi recommended).
- Consider rate limiting per deviceId to prevent abuse.
- Treat deviceId as an identifier but avoid logging it in plaintext in production logs; redact when possible.

## Troubleshooting
- DB connection errors: verify DATABASE_URL/PG* env vars and that DB accepts connections from your host.
- Schema issues: ensure server has permission to create tables or run migration scripts.

## Contact
- backend@talktally.dev
