import { redisClient } from '../config/redis';

const DEFAULT_TTL = 60; // seconds

// Redis-backed async cache — drop-in replacement for node-cache
export const AppCache = {
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = await redisClient.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Non-fatal — degrade gracefully if Redis is unavailable
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch {
      // Non-fatal
    }
  },
};

// Helper to generate consistent cache keys
export const generateCacheKey = (prefix: string, identifiers: Record<string, string | undefined>) => {
  const queryPart = Object.entries(identifiers)
    .filter(([, val]) => val !== undefined)
    .map(([key, val]) => `${key}:${val}`)
    .join('|');
  return `${prefix}[${queryPart}]`;
};
