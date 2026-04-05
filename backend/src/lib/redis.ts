/**
 * Shared Redis client singleton.
 *
 * Connects to REDIS_URL if set. Returns null if Redis is unavailable,
 * allowing callers to fall back to in-memory alternatives.
 */

import { createClient, RedisClientType } from 'redis';

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

export default getRedisClient;
