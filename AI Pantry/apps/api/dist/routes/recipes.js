"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const gemini_js_1 = require("../services/gemini.js");
const ingredientHash_js_1 = require("../services/ingredientHash.js");
const redis_js_1 = require("../services/redis.js");
const auth_js_1 = require("../middleware/auth.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const database_1 = require("database");
const router = (0, express_1.Router)();
// Rate limit: 20 recipe generations per hour per user
const recipeRateLimit = (0, rateLimit_js_1.createRateLimiter)({
    action: 'recipes:generate',
    maxRequests: 20,
    windowSeconds: 3600,
});
const GenerateRecipesSchema = zod_1.z.object({
    maxRecipes: zod_1.z.number().int().min(1).max(5).default(3),
});
/**
 * POST /api/recipes/generate
 * Generate waste-aware recipes from the user's current pantry.
 * Uses Redis cache keyed by MD5 hash of sorted ingredients + preferences.
 */
router.post('/generate', auth_js_1.requireAuth, recipeRateLimit, async (req, res) => {
    try {
        const parseResult = GenerateRecipesSchema.safeParse(req.body);
        const { maxRecipes } = parseResult.success ? parseResult.data : { maxRecipes: 3 };
        const userId = req.userId;
        // Fetch user's pantry items + preferences from DB
        const [pantryItems, preferences] = await Promise.all([
            database_1.prisma.pantryItem.findMany({
                where: { userId, isExpired: false },
                orderBy: { expiresAt: 'asc' },
            }),
            database_1.prisma.userPreference.findUnique({ where: { userId } }),
        ]);
        if (pantryItems.length === 0) {
            res.status(400).json({ error: 'No pantry items found. Add items to your pantry first.' });
            return;
        }
        // Build preference object
        const preferencesData = preferences
            ? {
                dietaryRestrictions: preferences.dietaryRestrictions,
                allergies: preferences.allergies,
                maxCookTimeMinutes: preferences.maxCookTimeMinutes,
                preferredCuisines: preferences.preferredCuisines,
            }
            : undefined;
        // Hash pantry + preferences for cache key
        const cacheKey = `recipes:${(0, ingredientHash_js_1.hashIngredients)(pantryItems.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            unit: p.unit,
            expiresAt: p.expiresAt?.toISOString(),
        })), preferencesData)}:count=${maxRecipes}`;
        // Check Redis cache first
        const cached = await (0, redis_js_1.cacheGet)(cacheKey);
        if (cached) {
            console.log(`[Recipes] Cache HIT for user ${userId}`);
            res.json({ success: true, data: { recipes: cached, fromCache: true } });
            return;
        }
        // Identify expiring items (within 3 days)
        const expiringItems = (0, ingredientHash_js_1.getExpiringItems)(pantryItems.map((p) => ({
            name: p.name,
            expiresAt: p.expiresAt?.toISOString(),
        })), 3);
        console.log(`[Recipes] Generating ${maxRecipes} recipes for user ${userId}. Expiring items: ${expiringItems.length}`);
        const recipes = await (0, gemini_js_1.generateRecipes)(pantryItems.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            unit: p.unit,
            expiresAt: p.expiresAt?.toISOString(),
            category: p.category,
        })), expiringItems, preferencesData, maxRecipes);
        // Cache for 2 hours
        await (0, redis_js_1.cacheSet)(cacheKey, recipes, 7200);
        res.json({ success: true, data: { recipes, fromCache: false } });
    }
    catch (error) {
        console.error('[Recipes] Generation error:', error);
        res.status(500).json({ error: 'Failed to generate recipes' });
    }
});
/**
 * POST /api/recipes/save
 * Save a generated recipe to the user's saved recipes.
 */
router.post('/save', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { title, description, prepTimeMinutes, cookTimeMinutes, servings, difficulty, ingredients, instructions, nutritionalData } = req.body;
        const saved = await database_1.prisma.savedRecipe.create({
            data: {
                userId,
                title,
                description,
                prepTimeMinutes: Number(prepTimeMinutes),
                cookTimeMinutes: Number(cookTimeMinutes),
                servings: Number(servings) || 2,
                difficulty,
                ingredients,
                instructions,
                nutritionalData,
            },
        });
        res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        console.error('[Recipes] Save error:', error);
        res.status(500).json({ error: 'Failed to save recipe' });
    }
});
/**
 * GET /api/recipes/saved
 * List user's saved recipes.
 */
router.get('/saved', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const recipes = await database_1.prisma.savedRecipe.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: recipes });
    }
    catch (error) {
        console.error('[Recipes] Fetch saved error:', error);
        res.status(500).json({ error: 'Failed to fetch saved recipes' });
    }
});
/**
 * POST /api/recipes/:id/finish-cooking
 * Atomic transaction: deduct pantry items used in a recipe after cooking.
 */
router.post('/:id/finish-cooking', auth_js_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { id: recipeId } = req.params;
        const { usedIngredients } = req.body;
        await database_1.prisma.$transaction(async (tx) => {
            // Deduct each ingredient from pantry
            for (const ingredient of usedIngredients) {
                const pantryItem = await tx.pantryItem.findFirst({
                    where: {
                        userId,
                        name: { contains: ingredient.name, mode: 'insensitive' },
                        isExpired: false,
                    },
                });
                if (pantryItem) {
                    const newQuantity = pantryItem.quantity - ingredient.amount;
                    if (newQuantity <= 0) {
                        await tx.pantryItem.delete({ where: { id: pantryItem.id } });
                    }
                    else {
                        await tx.pantryItem.update({
                            where: { id: pantryItem.id },
                            data: { quantity: newQuantity },
                        });
                    }
                }
            }
        });
        res.json({ success: true, message: 'Pantry updated after cooking' });
    }
    catch (error) {
        console.error('[Recipes] Finish cooking error:', error);
        res.status(500).json({ error: 'Failed to update pantry after cooking' });
    }
});
exports.default = router;
