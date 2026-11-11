import { Request, Response, NextFunction } from 'express';
import { rateLimitCheck } from '../services/redis.js';
import type { AuthRequest } from './auth.js';

interface RateLimitOptions {
  action: string;
  maxRequests: number;
  windowSeconds: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  return async function rateLimitMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const userId = req.userId ?? req.ip ?? 'anonymous';
    const { allowed, remaining, resetAt } = await rateLimitCheck(
      userId,
      options.action,
      options.maxRequests,
      options.windowSeconds
    );

    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetAt);

    if (!allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: resetAt - Math.floor(Date.now() / 1000),
      });
      return;
    }

    next();
  };
}
