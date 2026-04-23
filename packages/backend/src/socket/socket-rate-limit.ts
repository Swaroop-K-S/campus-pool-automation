import { redisClient } from '../config/redis';
import { Socket } from 'socket.io';

const RATE_LIMIT_EXPIRY_SECONDS = 60;

/**
 * Checks the Redis Sliding Window rate limit for a specific socket event.
 * Disconnects the socket forcefully if the threshold is breached.
 * 
 * @param socket The connecting or emitting Socket instance
 * @param action The event name being evaluated
 * @param maxRequests The limit per minute
 * @returns boolean True if allowed, false if dropped/disconnected
 */
export async function checkSocketRateLimit(socket: Socket, action: string, maxRequests: number): Promise<boolean> {
  // Use IP or socket id if auth is not strictly required.
  const identifier = socket.request.connection.remoteAddress || socket.id;
  const key = `ratelimit:socket:${identifier}:${action}`;

  try {
    const requests = await redisClient.incr(key);

    if (requests === 1) {
      // First request in the sliding window, set expiry
      await redisClient.expire(key, RATE_LIMIT_EXPIRY_SECONDS);
    }

    if (requests > maxRequests) {
      console.warn(`[SECURITY] Socket ${socket.id} (IP: ${identifier}) breached rate limit for '${action}'. Emits: ${requests}/${maxRequests} per min. Forcibly disconnecting.`);
      socket.disconnect(true);
      return false;
    }

    return true;
  } catch (error) {
    // If Redis goes down, we fail open to prevent breaking everything, 
    // but log the error heavily for devops visibility.
    console.error(`[SECURITY] Rate Limiter Redis Error:`, error);
    return true; 
  }
}
