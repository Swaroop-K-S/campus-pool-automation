import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { env } from '../config/env';

const isDev = env.NODE_ENV === 'development';

// Shared Redis store — distributed across all server nodes
const makeStore = () => {
  if (isDev) return undefined; // undefined tells express-rate-limit to use its default MemoryStore
  return new RedisStore({
    sendCommand: (...args: string[]) => (redisClient as any).call(...args),
  });
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore(),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore(),
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
});
