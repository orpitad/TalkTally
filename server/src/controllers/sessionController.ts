import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';

// ─── POST /sessions ────────────────────────────────────────────────────────────
// Body: { deviceId: string, accuracy: number, totalSteps: number }
// Creates a user row if one doesn't exist, then inserts the session record.
export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deviceId, accuracy, totalSteps } = req.body;

    // Validate inputs
    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ success: false, error: 'deviceId is required' });
      return;
    }
    if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 100) {
      res.status(400).json({ success: false, error: 'accuracy must be a number between 0 and 100' });
      return;
    }
    if (typeof totalSteps !== 'number' || totalSteps < 1) {
      res.status(400).json({ success: false, error: 'totalSteps must be a positive number' });
      return;
    }

    // Upsert user — create if first time this device has synced
    await pool.query(
      `INSERT INTO users (device_id) VALUES ($1) ON CONFLICT (device_id) DO NOTHING`,
      [deviceId]
    );

    // Insert session
    const result = await pool.query(
      `INSERT INTO sessions (device_id, accuracy, total_steps)
       VALUES ($1, $2, $3)
       RETURNING id, device_id, accuracy, total_steps, completed_at`,
      [deviceId, accuracy, totalSteps]
    );

    res.status(201).json({
      success: true,
      session: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /sessions ─────────────────────────────────────────────────────────────
// Query: ?deviceId=xxx
// Returns all sessions for the given device, newest first.
export const getSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deviceId } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
      res.status(400).json({ success: false, error: 'deviceId query param is required' });
      return;
    }

    const result = await pool.query(
      `SELECT id, accuracy, total_steps, completed_at
       FROM sessions
       WHERE device_id = $1
       ORDER BY completed_at DESC`,
      [deviceId]
    );

    res.status(200).json({
      success: true,
      sessions: result.rows,
    });
  } catch (err) {
    next(err);
  }
};