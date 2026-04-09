import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalLimiter } from './middleware/rate-limit.middleware';

const app: Express = express();

// Security Middlewares
app.use(helmet());
app.use(globalLimiter);
app.use(cookieParser());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      env.FRONTEND_URL,
    ].filter(Boolean);
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
