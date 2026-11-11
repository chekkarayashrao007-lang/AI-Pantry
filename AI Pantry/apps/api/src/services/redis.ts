import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    redis = Redis.fromEnv();
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const data = await client.get<T>(key);
    return data;
  } catch (error) {
    console.error('[Redis] Cache get error:', error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    const client = getRedis();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('[Redis] Cache set error:', error);
  }
}

export async function rateLimitCheck(
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const client = getRedis();
    const key = `ratelimit:${action}:${userId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, now - windowMs);
    pipeline.zadd(key, { score: now, member: now.toString() });
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const count = (results[2] as number) || 0;

    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = Math.ceil((now + windowMs) / 1000);

    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error('[Redis] Rate limit check error:', error);
    // Fail open — allow request if Redis is down
    return { allowed: true, remaining: maxRequests, resetAt: 0 };
  }
}
