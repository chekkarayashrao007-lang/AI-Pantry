import { Router, Response } from 'express';
import { z } from 'zod';
import { generateRecipes } from '../services/gemini.js';
import { hashIngredients, getExpiringItems } from '../services/ingredientHash.js';
import { cacheGet, cacheSet } from '../services/redis.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { prisma } from 'database';
import type { GeneratedRecipe } from '../types/index.js';

const router = Router();

// Rate limit: 20 recipe generations per hour per user
const recipeRateLimit = createRateLimiter({
  action: 'recipes:generate',
  maxRequests: 20,
  windowSeconds: 3600,
});

const GenerateRecipesSchema = z.object({
  maxRecipes: z.number().int().min(1).max(5).default(3),
});

/**
 * POST /api/recipes/generate
 * Generate waste-aware recipes from the user's current pantry.
 * Uses Redis cache keyed by MD5 hash of sorted ingredients + preferences.
 */
router.post(
  '/generate',
  requireAuth,
  recipeRateLimit,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = GenerateRecipesSchema.safeParse(req.body);
      const { maxRecipes } = parseResult.success ? parseResult.data : { maxRecipes: 3 };

      const userId = req.userId!;

      // Fetch user's pantry items + preferences from DB
      const [pantryItems, preferences] = await Promise.all([
        prisma.pantryItem.findMany({
          where: { userId, isExpired: false },
          orderBy: { expiresAt: 'asc' },
        }),
        prisma.userPreference.findUnique({ where: { userId } }),
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
      const cacheKey = `recipes:${hashIngredients(
        pantryItems.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
          expiresAt: p.expiresAt?.toISOString(),
        })),
        preferencesData
      )}:count=${maxRecipes}`;

      // Check Redis cache first
      const cached = await cacheGet<GeneratedRecipe[]>(cacheKey);
      if (cached) {
        console.log(`[Recipes] Cache HIT for user ${userId}`);
        res.json({ success: true, data: { recipes: cached, fromCache: true } });
        return;
      }

      // Identify expiring items (within 3 days)
      const expiringItems = getExpiringItems(
        pantryItems.map((p) => ({
          name: p.name,
          expiresAt: p.expiresAt?.toISOString(),
        })),
        3
      );

      console.log(
        `[Recipes] Generating ${maxRecipes} recipes for user ${userId}. Expiring items: ${expiringItems.length}`
      );

      const recipes = await generateRecipes(
        pantryItems.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
          expiresAt: p.expiresAt?.toISOString(),
          category: p.category,
        })),
        expiringItems,
        preferencesData,
        maxRecipes
      );

      // Cache for 2 hours
      await cacheSet(cacheKey, recipes, 7200);

      res.json({ success: true, data: { recipes, fromCache: false } });
    } catch (error) {
      console.error('[Recipes] Generation error:', error);
      res.status(500).json({ error: 'Failed to generate recipes' });
    }
  }
);

/**
 * POST /api/recipes/save
 * Save a generated recipe to the user's saved recipes.
 */
router.post('/save', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { title, description, prepTimeMinutes, cookTimeMinutes, servings, difficulty, ingredients, instructions, nutritionalData } = req.body;

    const saved = await prisma.savedRecipe.create({
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
  } catch (error) {
    console.error('[Recipes] Save error:', error);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

/**
 * GET /api/recipes/saved
 * List user's saved recipes.
 */
router.get('/saved', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const recipes = await prisma.savedRecipe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: recipes });
  } catch (error) {
    console.error('[Recipes] Fetch saved error:', error);
    res.status(500).json({ error: 'Failed to fetch saved recipes' });
  }
});

/**
 * POST /api/recipes/:id/finish-cooking
 * Atomic transaction: deduct pantry items used in a recipe after cooking.
 */
router.post(
  '/:id/finish-cooking',
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id: recipeId } = req.params;
      const { usedIngredients } = req.body as {
        usedIngredients: Array<{ name: string; amount: number; unit: string }>;
      };

      await prisma.$transaction(async (tx) => {
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
            } else {
              await tx.pantryItem.update({
                where: { id: pantryItem.id },
                data: { quantity: newQuantity },
              });
            }
          }
        }
      });

      res.json({ success: true, message: 'Pantry updated after cooking' });
    } catch (error) {
      console.error('[Recipes] Finish cooking error:', error);
      res.status(500).json({ error: 'Failed to update pantry after cooking' });
    }
  }
);

export default router;
