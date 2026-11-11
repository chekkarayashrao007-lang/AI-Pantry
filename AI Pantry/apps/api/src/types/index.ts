export interface DetectedItem {
  name: string;
  category: string;
  estimatedQuantity: number;
  unit: string;
  estimatedDaysFresh: number;
  confidenceScore?: number;
}

export interface VisionScanResponse {
  detectedItems: DetectedItem[];
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  isFromPantry: boolean;
}

export interface NutritionalData {
  calories: number;
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  missingIngredients: string[];
  nutritionalData: NutritionalData;
  wasteReductionScore: number; // 0-100, how much it reduces pantry waste
}

export interface RecipeGenerationRequest {
  userId: string;
  pantryItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    expiresAt?: string;
    category: string;
  }>;
  preferences?: {
    dietaryRestrictions: string[];
    allergies: string[];
    maxCookTimeMinutes: number;
    preferredCuisines: string[];
  };
  maxRecipes?: number;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}
