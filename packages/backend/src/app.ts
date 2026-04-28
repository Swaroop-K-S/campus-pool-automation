import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalLimiter } from './middleware/rate-limit.middleware';
import { authenticate } from './middleware/auth.middleware';

// ── Bull-Board Queue Mission Control ─────────────────────────────────────────
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { resumeParsingQueue } from './workers/resume.worker';

const bullBoardAdapter = new ExpressAdapter();
bullBoardAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(resumeParsingQueue)],
  serverAdapter: bullBoardAdapter,
});
// ─────────────────────────────────────────────────────────────────────────────

const app: Express = express();

// Security Middlewares
// Bull-Board serves its own JS/CSS assets — Helmet's strict CSP blocks them.
// We disable CSP only for the /admin/queues path; all other routes stay hardened.
app.use('/admin/queues', helmet({ contentSecurityPolicy: false }));
app.use(helmet());
app.use(globalLimiter);
app.use(cookieParser());
app.use(
  cors({
    origin: ['http://localhost', 'http://localhost:5173', process.env.FRONTEND_URL || ''],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Crucial if you are passing JWTs in cookies
  }),
);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import apiRoutes from './routes';
app.use('/api/v1', apiRoutes);

// ── Queue Dashboard (Admin only) ──────────────────────────────────────────────
// Protected by authenticate middleware — only valid admin JWTs get through.
// Access at: http://localhost:8080/admin/queues
app.use('/admin/queues', authenticate, bullBoardAdapter.getRouter());

// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date() } });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${err.name}: ${err.message}`);

  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
});

export { app };
