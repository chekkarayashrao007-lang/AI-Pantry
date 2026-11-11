import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { prisma } from 'database';

const router = Router();

const CreatePantryItemSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['Produce', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Frozen', 'Beverages', 'Condiments']),
  quantity: z.number().positive().default(1),
  unit: z.string().min(1).max(20),
  expiresAt: z.string().datetime().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
});

const UpdatePantryItemSchema = CreatePantryItemSchema.partial();

/**
 * GET /api/pantry
 * List user's pantry items. Auto-mark expired items.
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const now = new Date();

    // Auto-mark expired items
    await prisma.pantryItem.updateMany({
      where: {
        userId,
        isExpired: false,
        expiresAt: { lte: now },
      },
      data: { isExpired: true },
    });

    const items = await prisma.pantryItem.findMany({
      where: { userId },
      orderBy: [{ isExpired: 'asc' }, { expiresAt: 'asc' }],
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('[Pantry] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pantry items' });
  }
});

/**
 * POST /api/pantry
 * Add a single pantry item.
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parseResult = CreatePantryItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const item = await prisma.pantryItem.create({
      data: { ...parseResult.data, userId: req.userId!, expiresAt: parseResult.data.expiresAt ? new Date(parseResult.data.expiresAt) : undefined },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('[Pantry] Create error:', error);
    res.status(500).json({ error: 'Failed to create pantry item' });
  }
});

/**
 * POST /api/pantry/bulk
 * Bulk-add pantry items (from vision scan).
 */
router.post('/bulk', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body as { items: Array<z.infer<typeof CreatePantryItemSchema>> };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const userId = req.userId!;
    const created = await prisma.pantryItem.createMany({
      data: items.map((item) => ({
        ...item,
        userId,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
      })),
    });

    res.status(201).json({ success: true, data: { count: created.count } });
  } catch (error) {
    console.error('[Pantry] Bulk create error:', error);
    res.status(500).json({ error: 'Failed to bulk add pantry items' });
  }
});

/**
 * PATCH /api/pantry/:id
 * Update a pantry item.
 */
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parseResult = UpdatePantryItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const item = await prisma.pantryItem.updateMany({
      where: { id, userId: req.userId! },
      data: { ...parseResult.data, expiresAt: parseResult.data.expiresAt ? new Date(parseResult.data.expiresAt) : undefined },
    });

    if (item.count === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Pantry] Update error:', error);
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

/**
 * DELETE /api/pantry/:id
 * Remove a pantry item.
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await prisma.pantryItem.deleteMany({
      where: { id, userId: req.userId! },
    });

    if (deleted.count === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Pantry] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete pantry item' });
  }
});

export default router;
