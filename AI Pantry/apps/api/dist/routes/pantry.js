"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const database_1 = require("database");
const router = (0, express_1.Router)();
const CreatePantryItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    category: zod_1.z.enum(['Produce', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Frozen', 'Beverages', 'Condiments']),
    quantity: zod_1.z.number().positive().default(1),
    unit: zod_1.z.string().min(1).max(20),
    expiresAt: zod_1.z.string().datetime().optional(),
    confidenceScore: zod_1.z.number().min(0).max(1).optional(),
});
const UpdatePantryItemSchema = CreatePantryItemSchema.partial();
/**
 * GET /api/pantry
 * List user's pantry items. Auto-mark expired items.
 */
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const now = new Date();
        // Auto-mark expired items
        await database_1.prisma.pantryItem.updateMany({
            where: {
                userId,
                isExpired: false,
                expiresAt: { lte: now },
            },
            data: { isExpired: true },
        });
        const items = await database_1.prisma.pantryItem.findMany({
            where: { userId },
            orderBy: [{ isExpired: 'asc' }, { expiresAt: 'asc' }],
        });
        res.json({ success: true, data: items });
    }
    catch (error) {
        console.error('[Pantry] Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch pantry items' });
    }
});
/**
 * POST /api/pantry
 * Add a single pantry item.
 */
router.post('/', auth_js_1.requireAuth, async (req, res) => {
    try {
        const parseResult = CreatePantryItemSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
            return;
        }
        const item = await database_1.prisma.pantryItem.create({
            data: { ...parseResult.data, userId: req.userId, expiresAt: parseResult.data.expiresAt ? new Date(parseResult.data.expiresAt) : undefined },
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        console.error('[Pantry] Create error:', error);
        res.status(500).json({ error: 'Failed to create pantry item' });
    }
});
/**
 * POST /api/pantry/bulk
 * Bulk-add pantry items (from vision scan).
 */
router.post('/bulk', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Items array is required' });
            return;
        }
        const userId = req.userId;
        const created = await database_1.prisma.pantryItem.createMany({
            data: items.map((item) => ({
                ...item,
                userId,
                expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
            })),
        });
        res.status(201).json({ success: true, data: { count: created.count } });
    }
    catch (error) {
        console.error('[Pantry] Bulk create error:', error);
        res.status(500).json({ error: 'Failed to bulk add pantry items' });
    }
});
/**
 * PATCH /api/pantry/:id
 * Update a pantry item.
 */
router.patch('/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const parseResult = UpdatePantryItemSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
            return;
        }
        const item = await database_1.prisma.pantryItem.updateMany({
            where: { id, userId: req.userId },
            data: { ...parseResult.data, expiresAt: parseResult.data.expiresAt ? new Date(parseResult.data.expiresAt) : undefined },
        });
        if (item.count === 0) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('[Pantry] Update error:', error);
        res.status(500).json({ error: 'Failed to update pantry item' });
    }
});
/**
 * DELETE /api/pantry/:id
 * Remove a pantry item.
 */
router.delete('/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await database_1.prisma.pantryItem.deleteMany({
            where: { id, userId: req.userId },
        });
        if (deleted.count === 0) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('[Pantry] Delete error:', error);
        res.status(500).json({ error: 'Failed to delete pantry item' });
    }
});
exports.default = router;
