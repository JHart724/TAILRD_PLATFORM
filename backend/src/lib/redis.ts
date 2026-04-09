/**
 * Shared Redis client singleton.
 *
 * Connects to REDIS_URL if set. Returns null if Redis is unavailable,
 * allowing callers to fall back to in-memory alternatives.
 */

import { createClient, RedisClientType } from 'redis';
import type { Store } from 'express-rate-limit';

let client: RedisClientType | null = null;
let connectionAttempted = false;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (connectionAttempted) return client;
  connectionAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('REDIS_URL not set. Rate limiting and caching will use in-memory stores.');
    return null;
  }

  try {
    client = createClient({ url }) as RedisClientType;
    client.on('error', (err) => {
      console.error('Redis error:', err.message);
    });
    await client.connect();
    console.log('Redis connected.');
    return client;
  } catch (err: any) {
    console.warn(`Redis connection failed: ${err.message}. Falling back to in-memory.`);
    client = null;
    return null;
  }
}

/**
 * Creates a RedisStore for express-rate-limit if Redis is connected.
 * Returns undefined if Redis is unavailable (falls back to in-memory).
 */
export function createRedisRateLimitStore(prefix: string): Store | undefined {
  if (!client) return undefined;
  try {
    // Dynamic require to avoid crashing at module load if package is missing
    const { RedisStore } = require('rate-limit-redis');
    return new RedisStore({
      sendCommand: (...args: string[]) => client!.sendCommand(args),
      prefix: `rl:${prefix}:`,
    });
  } catch (err: any) {
    console.warn(`rate-limit-redis not available: ${err.message}. Using in-memory store.`);
    return undefined;
  }
}

export default getRedisClient;
