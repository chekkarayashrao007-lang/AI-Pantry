"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const database_1 = require("database");
const router = (0, express_1.Router)();
const CreateShoppingItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    quantity: zod_1.z.number().positive().default(1),
    unit: zod_1.z.string().default('pcs'),
    category: zod_1.z.string().default('Pantry'),
});
/**
 * GET /api/shopping
 * Get user's shopping list.
 */
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const items = await database_1.prisma.shoppingItem.findMany({
            where: { userId: req.userId },
            orderBy: [{ isBought: 'asc' }, { category: 'asc' }],
        });
        res.json({ success: true, data: items });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch shopping list' });
    }
});
/**
 * POST /api/shopping
 * Add an item to the shopping list.
 */
router.post('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const parseResult = CreateShoppingItemSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
            return;
        }
        const item = await database_1.prisma.shoppingItem.create({
            data: { ...parseResult.data, userId: req.userId },
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add shopping item' });
    }
});
/**
 * POST /api/shopping/bulk-from-recipe
 * Add all missing ingredients from a recipe to the shopping list.
 */
router.post('/bulk-from-recipe', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Items array is required' });
            return;
        }
        const created = await database_1.prisma.shoppingItem.createMany({
            data: items.map((item) => ({
                name: item.name,
                quantity: item.quantity ?? 1,
                unit: item.unit ?? 'pcs',
                category: item.category ?? 'Pantry',
                userId: req.userId,
            })),
            skipDuplicates: false,
        });
        res.status(201).json({ success: true, data: { count: created.count } });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add recipe ingredients to shopping list' });
    }
});
/**
 * PATCH /api/shopping/:id/toggle
 * Toggle bought status of a shopping item.
 */
router.patch('/:id/toggle', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const item = await database_1.prisma.shoppingItem.findFirst({ where: { id, userId: req.userId } });
        if (!item) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        const updated = await database_1.prisma.shoppingItem.update({
            where: { id },
            data: { isBought: !item.isBought },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to toggle shopping item' });
    }
});
/**
 * DELETE /api/shopping/:id
 */
router.delete('/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const deleted = await database_1.prisma.shoppingItem.deleteMany({
            where: { id: req.params.id, userId: req.userId },
        });
        if (deleted.count === 0) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete shopping item' });
    }
});
/**
 * DELETE /api/shopping/clear-bought
 * Remove all bought items.
 */
router.delete('/clear-bought', auth_js_1.requireAuth, async (req, res) => {
    try {
        await database_1.prisma.shoppingItem.deleteMany({ where: { userId: req.userId, isBought: true } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to clear bought items' });
    }
});
exports.default = router;
