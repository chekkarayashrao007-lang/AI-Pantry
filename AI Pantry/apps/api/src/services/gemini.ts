import { GoogleGenAI, Type } from '@google/genai';
import type { DetectedItem, GeneratedRecipe, RecipeIngredient, NutritionalData } from '../types/index.js';

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAIInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIInstance;
}

const VISION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['Produce', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Frozen', 'Beverages', 'Condiments'],
          },
          estimatedQuantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          estimatedDaysFresh: { type: Type.NUMBER },
          confidenceScore: { type: Type.NUMBER },
        },
        required: ['name', 'category', 'estimatedQuantity', 'unit', 'estimatedDaysFresh', 'confidenceScore'],
      },
    },
  },
  required: ['detectedItems'],
};

const RECIPE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    recipes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          prepTimeMinutes: { type: Type.NUMBER },
          cookTimeMinutes: { type: Type.NUMBER },
          servings: { type: Type.NUMBER },
          difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                isFromPantry: { type: Type.BOOLEAN },
              },
              required: ['name', 'amount', 'unit', 'isFromPantry'],
            },
          },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          nutritionalData: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
            },
            required: ['calories', 'protein', 'carbs', 'fat'],
          },
          wasteReductionScore: { type: Type.NUMBER },
        },
        required: ['title', 'description', 'prepTimeMinutes', 'cookTimeMinutes', 'servings', 'difficulty', 'ingredients', 'instructions', 'missingIngredients', 'nutritionalData', 'wasteReductionScore'],
      },
    },
  },
  required: ['recipes'],
};

/**
 * Scan a pantry image and return detected ingredients via Gemini Vision.
 */
export async function scanPantryImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<DetectedItem[]> {
  const genAI = getGenAI();

  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: `You are a professional chef and food expert. Analyze this pantry/refrigerator/kitchen image carefully.

Identify ALL visible food items, ingredients, and produce. For each item:
1. Name it precisely (e.g., "Roma Tomatoes" not just "Tomatoes")
2. Assign the correct category: Produce, Dairy, Meat, Pantry, Bakery, Frozen, Beverages, or Condiments
3. Estimate quantity visible (count items or estimate weight/volume)
4. Assign appropriate unit: pcs, g, kg, oz, ml, l, tbsp, tsp, cups
5. Estimate how many days it stays fresh from today (e.g., spinach=3, onions=30, canned beans=730)
6. Rate your confidence 0.0-1.0 (1.0 = very certain)

Be thorough — scan every visible shelf, drawer, and compartment. Only return items you can actually see.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: VISION_RESPONSE_SCHEMA,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  const text = response.text ?? '{"detectedItems":[]}';
  const parsed = JSON.parse(text) as { detectedItems: DetectedItem[] };
  return parsed.detectedItems;
}

/**
 * Generate waste-aware recipes from pantry items using Gemini.
 */
export async function generateRecipes(
  pantryItems: Array<{ name: string; quantity: number; unit: string; expiresAt?: string; category: string }>,
  expiringItems: Array<{ name: string }>,
  preferences?: {
    dietaryRestrictions: string[];
    allergies: string[];
    maxCookTimeMinutes: number;
    preferredCuisines: string[];
  },
  maxRecipes: number = 3
): Promise<GeneratedRecipe[]> {
  const genAI = getGenAI();

  const expiringNames = expiringItems.map((i) => i.name);
  const pantryList = pantryItems
    .map((item) => {
      const isExpiring = expiringNames.includes(item.name);
      const expiryNote = item.expiresAt
        ? ` (expires: ${new Date(item.expiresAt).toLocaleDateString()}${isExpiring ? ' ⚠️ EXPIRING SOON' : ''})`
        : '';
      return `- ${item.name}: ${item.quantity} ${item.unit}${expiryNote}`;
    })
    .join('\n');

  const dietaryNote =
    preferences?.dietaryRestrictions?.length
      ? `\nDietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}`
      : '';
  const allergyNote =
    preferences?.allergies?.length
      ? `\nAllergies (NEVER use these): ${preferences.allergies.join(', ')}`
      : '';
  const cuisineNote =
    preferences?.preferredCuisines?.length
      ? `\nPreferred Cuisines: ${preferences.preferredCuisines.join(', ')}`
      : '';
  const timeNote = preferences?.maxCookTimeMinutes
    ? `\nMax Total Cook Time: ${preferences.maxCookTimeMinutes} minutes`
    : '';

  const prompt = `You are a world-class chef specializing in zero-waste cooking. Generate exactly ${maxRecipes} recipes using the pantry items below.

## Available Pantry Items:
${pantryList}

## Constraints:
${dietaryNote}${allergyNote}${cuisineNote}${timeNote}
- PRIORITIZE using items marked "⚠️ EXPIRING SOON" to minimize food waste
- Assume these basic staples are always available: cooking oil, salt, black pepper, tap water, basic spices
- Maximum 3 missing ingredients per recipe
- Each instruction step MUST include timing (e.g., "Cook for 3-4 minutes until golden")
- Calculate a wasteReductionScore (0-100) based on how many expiring items are used

## Output Format:
Return exactly ${maxRecipes} complete, detailed recipes with step-by-step instructions.`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RECIPE_RESPONSE_SCHEMA,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 2048 },
    },
  });

  const text = response.text ?? '{"recipes":[]}';
  const parsed = JSON.parse(text) as { recipes: GeneratedRecipe[] };
  return parsed.recipes;
}
