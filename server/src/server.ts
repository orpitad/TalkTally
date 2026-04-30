import express from 'express';
import cors from 'cors';
import { pool, initDb } from './config/db';
import sessionRoutes from './routes/sessionRoutes';
import { errorHandler } from './middleware/errorHandler';

// Only load .env in local development — Railway injects vars directly
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/sessions', sessionRoutes);
app.use(errorHandler);

const start = async () => {
  try {
    await initDb();
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