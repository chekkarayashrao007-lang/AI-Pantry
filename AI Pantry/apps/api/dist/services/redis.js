"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.rateLimitCheck = rateLimitCheck;
const redis_1 = require("@upstash/redis");
let redis = null;
function getRedis() {
    if (!redis) {
        if (!process.env.REDIS_URL) {
            throw new Error('REDIS_URL environment variable is not set');
        }
        redis = redis_1.Redis.fromEnv();
    }
    return redis;
}
async function cacheGet(key) {
    try {
        const client = getRedis();
        const data = await client.get(key);
        return data;
    }
    catch (error) {
        console.error('[Redis] Cache get error:', error);
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds = 3600) {
    try {
        const client = getRedis();
        await client.setex(key, ttlSeconds, JSON.stringify(value));
    }
    catch (error) {
        console.error('[Redis] Cache set error:', error);
    }
}
async function rateLimitCheck(userId, action, maxRequests, windowSeconds) {
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
        const count = results[2] || 0;
        const allowed = count <= maxRequests;
        const remaining = Math.max(0, maxRequests - count);
        const resetAt = Math.ceil((now + windowMs) / 1000);
        return { allowed, remaining, resetAt };
    }
    catch (error) {
        console.error('[Redis] Rate limit check error:', error);
        // Fail open — allow request if Redis is down
        return { allowed: true, remaining: maxRequests, resetAt: 0 };
    }
}
