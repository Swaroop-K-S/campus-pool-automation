import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';

const app: Express = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import apiRoutes from './routes';
app.use('/api/v1', apiRoutes);

// Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { status: "ok", timestamp: new Date() } });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${err.name}: ${err.message}`);
  
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

export { app };
