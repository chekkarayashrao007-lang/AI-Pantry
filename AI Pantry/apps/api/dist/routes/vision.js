"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const gemini_js_1 = require("../services/gemini.js");
const auth_js_1 = require("../middleware/auth.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const router = (0, express_1.Router)();
// Rate limit: 10 vision scans per hour per user
const visionRateLimit = (0, rateLimit_js_1.createRateLimiter)({
    action: 'vision:scan',
    maxRequests: 10,
    windowSeconds: 3600,
});
const ScanPantrySchema = zod_1.z.object({
    imageBase64: zod_1.z.string().min(100, 'Image data is required'),
    mimeType: zod_1.z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
});
/**
 * POST /api/vision/scan-pantry
 * Accepts a base64-encoded image and returns detected pantry items via Gemini Vision.
 */
router.post('/scan-pantry', auth_js_1.requireAuth, visionRateLimit, async (req, res) => {
    try {
        const parseResult = ScanPantrySchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
            return;
        }
        const { imageBase64, mimeType } = parseResult.data;
        console.log(`[Vision] Scanning pantry for user ${req.userId}`);
        const detectedItems = await (0, gemini_js_1.scanPantryImage)(imageBase64, mimeType);
        res.json({
            success: true,
            data: {
                detectedItems,
                scannedAt: new Date().toISOString(),
                itemCount: detectedItems.length,
            },
        });
    }
    catch (error) {
        console.error('[Vision] Scan error:', error);
        res.status(500).json({ error: 'Failed to scan pantry image' });
    }
});
exports.default = router;
