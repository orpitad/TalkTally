import { Router } from 'express';
import { createSession, getSessions } from '../controllers/sessionController';

const router = Router();

router.post('/', createSession);   // POST /sessions
router.get('/', getSessions);      // GET  /sessions?deviceId=xxx

export default router;