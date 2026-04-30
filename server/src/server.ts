import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDb } from './config/db';
import sessionRoutes from './routes/sessionRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/sessions', sessionRoutes);
app.use(errorHandler);

// Initialize DB schema then start server
const start = async () => {
  try {
    await initDb(); // creates tables if they don't exist
    app.listen(PORT, () => {
      console.log(`🚀 TalkTally server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
};

start();

export default app;