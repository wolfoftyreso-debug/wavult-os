import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { router } from './api/routes.js';
import { qzRouter } from './api/quixzoom-routes.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.QUIXOOM_PORT || '4100', 10);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Routes — Financial Core
app.use('/api/qx', router);

// Routes — QuixZoom Platform
app.use('/api/qz', qzRouter);

// Start
app.listen(port, () => {
  console.log(`[quixzoom] running on port ${port}`);
  console.log(`  Financial API: /api/qx`);
  console.log(`  Platform API:  /api/qz`);
});

export default app;
