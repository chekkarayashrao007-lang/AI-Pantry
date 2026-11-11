"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPantryImage = scanPantryImage;
exports.generateRecipes = generateRecipes;
const genai_1 = require("@google/genai");
let genAIInstance = null;
function getGenAI() {
    if (!genAIInstance) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        genAIInstance = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return genAIInstance;
}
const VISION_RESPONSE_SCHEMA = {
    type: genai_1.Type.OBJECT,
    properties: {
        detectedItems: {
            type: genai_1.Type.ARRAY,
            items: {
                type: genai_1.Type.OBJECT,
                properties: {
                    name: { type: genai_1.Type.STRING },
                    category: {
                        type: genai_1.Type.STRING,
                        enum: ['Produce', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Frozen', 'Beverages', 'Condiments'],
                    },
                    estimatedQuantity: { type: genai_1.Type.NUMBER },
                    unit: { type: genai_1.Type.STRING },
                    estimatedDaysFresh: { type: genai_1.Type.NUMBER },
                    confidenceScore: { type: genai_1.Type.NUMBER },
                },
                required: ['name', 'category', 'estimatedQuantity', 'unit', 'estimatedDaysFresh', 'confidenceScore'],
            },
        },
    },
    required: ['detectedItems'],
};
const RECIPE_RESPONSE_SCHEMA = {
    type: genai_1.Type.OBJECT,
    properties: {
        recipes: {
            type: genai_1.Type.ARRAY,
            items: {
                type: genai_1.Type.OBJECT,
                properties: {
                    title: { type: genai_1.Type.STRING },
                    description: { type: genai_1.Type.STRING },
                    prepTimeMinutes: { type: genai_1.Type.NUMBER },
                    cookTimeMinutes: { type: genai_1.Type.NUMBER },
                    servings: { type: genai_1.Type.NUMBER },
                    difficulty: { type: genai_1.Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
                    ingredients: {
                        type: genai_1.Type.ARRAY,
                        items: {
                            type: genai_1.Type.OBJECT,
                            properties: {
                                name: { type: genai_1.Type.STRING },
                                amount: { type: genai_1.Type.NUMBER },
                                unit: { type: genai_1.Type.STRING },
                                isFromPantry: { type: genai_1.Type.BOOLEAN },
                            },
                            required: ['name', 'amount', 'unit', 'isFromPantry'],
                        },
                    },
                    instructions: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.STRING } },
                    missingIngredients: { type: genai_1.Type.ARRAY, items: { type: genai_1.Type.STRING } },
                    nutritionalData: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            calories: { type: genai_1.Type.NUMBER },
                            protein: { type: genai_1.Type.NUMBER },
                            carbs: { type: genai_1.Type.NUMBER },
                            fat: { type: genai_1.Type.NUMBER },
                        },
                        required: ['calories', 'protein', 'carbs', 'fat'],
                    },
                    wasteReductionScore: { type: genai_1.Type.NUMBER },
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
async function scanPantryImage(imageBase64, mimeType = 'image/jpeg') {
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
    const parsed = JSON.parse(text);
    return parsed.detectedItems;
}
/**
 * Generate waste-aware recipes from pantry items using Gemini.
 */
async function generateRecipes(pantryItems, expiringItems, preferences, maxRecipes = 3) {
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
    const dietaryNote = preferences?.dietaryRestrictions?.length
        ? `\nDietary Restrictions: ${preferences.dietaryRestrictions.join(', ')}`
        : '';
    const allergyNote = preferences?.allergies?.length
        ? `\nAllergies (NEVER use these): ${preferences.allergies.join(', ')}`
        : '';
    const cuisineNote = preferences?.preferredCuisines?.length
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
    const parsed = JSON.parse(text);
    return parsed.recipes;
}
