import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { scanPantryImage } from '../services/gemini.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Rate limit: 10 vision scans per hour per user
const visionRateLimit = createRateLimiter({
  action: 'vision:scan',
  maxRequests: 10,
  windowSeconds: 3600,
});

const ScanPantrySchema = z.object({
  imageBase64: z.string().min(100, 'Image data is required'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
});

/**
 * POST /api/vision/scan-pantry
 * Accepts a base64-encoded image and returns detected pantry items via Gemini Vision.
 */
router.post(
  '/scan-pantry',
  requireAuth,
  visionRateLimit,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = ScanPantrySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
        return;
      }

      const { imageBase64, mimeType } = parseResult.data;

      console.log(`[Vision] Scanning pantry for user ${req.userId}`);
      const detectedItems = await scanPantryImage(imageBase64, mimeType);

      res.json({
        success: true,
        data: {
          detectedItems,
          scannedAt: new Date().toISOString(),
          itemCount: detectedItems.length,
        },
      });
    } catch (error) {
      console.error('[Vision] Scan error:', error);
      res.status(500).json({ error: 'Failed to scan pantry image' });
    }
  }
);

export default router;
