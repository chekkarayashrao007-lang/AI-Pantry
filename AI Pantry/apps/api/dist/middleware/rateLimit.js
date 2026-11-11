"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const redis_js_1 = require("../services/redis.js");
function createRateLimiter(options) {
    return async function rateLimitMiddleware(req, res, next) {
        const userId = req.userId ?? req.ip ?? 'anonymous';
        const { allowed, remaining, resetAt } = await (0, redis_js_1.rateLimitCheck)(userId, options.action, options.maxRequests, options.windowSeconds);
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
