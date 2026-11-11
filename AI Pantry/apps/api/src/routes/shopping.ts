import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { prisma } from 'database';

const router = Router();

const CreateShoppingItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().positive().default(1),
  unit: z.string().default('pcs'),
  category: z.string().default('Pantry'),
});

/**
 * GET /api/shopping
 * Get user's shopping list.
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.shoppingItem.findMany({
      where: { userId: req.userId! },
      orderBy: [{ isBought: 'asc' }, { category: 'asc' }],
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

/**
 * POST /api/shopping
 * Add an item to the shopping list.
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parseResult = CreateShoppingItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const item = await prisma.shoppingItem.create({
      data: { ...parseResult.data, userId: req.userId! },
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add shopping item' });
  }
});

/**
 * POST /api/shopping/bulk-from-recipe
 * Add all missing ingredients from a recipe to the shopping list.
 */
router.post('/bulk-from-recipe', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body as {
      items: Array<{ name: string; quantity?: number; unit?: string; category?: string }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required' });
      return;
    }

    const created = await prisma.shoppingItem.createMany({
      data: items.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? 'pcs',
        category: item.category ?? 'Pantry',
        userId: req.userId!,
      })),
      skipDuplicates: false,
    });

    res.status(201).json({ success: true, data: { count: created.count } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add recipe ingredients to shopping list' });
  }
});

/**
 * PATCH /api/shopping/:id/toggle
 * Toggle bought status of a shopping item.
 */
router.patch('/:id/toggle', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.shoppingItem.findFirst({ where: { id, userId: req.userId! } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const updated = await prisma.shoppingItem.update({
      where: { id },
      data: { isBought: !item.isBought },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle shopping item' });
  }
});

/**
 * DELETE /api/shopping/:id
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await prisma.shoppingItem.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (deleted.count === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shopping item' });
  }
});

/**
 * DELETE /api/shopping/clear-bought
 * Remove all bought items.
 */
router.delete('/clear-bought', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.shoppingItem.deleteMany({ where: { userId: req.userId!, isBought: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear bought items' });
  }
});

export default router;
