import Redis from 'ioredis';
import { env } from './env';

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';

const isDev = env.NODE_ENV === 'development';

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: (times: number) => {
    if (isDev) return null; // In dev, don't even retry, we will fall back to in-memory immediately
    if (times > 5) return null; // Stop retrying after 5 attempts
    return Math.min(times * 2000, 30000);
  },
});

let _errorLogged = false;
redisClient.on('error', (err: Error) => {
  if (!_errorLogged) {
    console.warn(`⚠️  Redis unavailable (${err.message}) — caching/rate-limiting will degrade gracefully`);
    _errorLogged = true;
  }
});

redisClient.on('connect', () => {
  _errorLogged = false;
  console.log('✅ Redis connection established');
});

// Separate pub/sub clients for Socket.io adapter
export const pubClient = redisClient.duplicate();
export const subClient = redisClient.duplicate();

// IMPORTANT: Catch all unhandled connection closed errors to prevent PM2/Node crash loops
const noopError = () => {};
pubClient.on('error', noopError);
subClient.on('error', noopError);


