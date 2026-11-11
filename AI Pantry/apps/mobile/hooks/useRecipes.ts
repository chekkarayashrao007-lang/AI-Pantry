import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  isFromPantry: boolean;
}

export interface NutritionalData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id?: string;
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
  wasteReductionScore?: number;
  createdAt?: string;
}

async function getToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export function useGenerateRecipes(maxRecipes: number = 3) {
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const result = await apiFetch<{
        success: boolean;
        data: { recipes: Recipe[]; fromCache: boolean };
      }>(
        '/api/recipes/generate',
        { method: 'POST', body: JSON.stringify({ maxRecipes }) },
        token
      );
      return result.data;
    },
  });
}

export function useSavedRecipes() {
  return useQuery({
    queryKey: ['saved-recipes'],
    queryFn: async () => {
      const token = await getToken();
      const result = await apiFetch<{ success: boolean; data: Recipe[] }>(
        '/api/recipes/saved',
        {},
        token
      );
      return result.data;
    },
  });
}

export function useSaveRecipe() {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  return useMutation({
    mutationFn: async (recipe: Omit<Recipe, 'id' | 'createdAt'>) => {
      const token = await getToken();
      return apiFetch<{ success: boolean; data: Recipe }>(
        '/api/recipes/save',
        { method: 'POST', body: JSON.stringify(recipe) },
        token
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-recipes'] });
      showToast('Recipe saved!', 'success');
    },
    onError: () => {
      showToast('Failed to save recipe', 'error');
    },
  });
}

export function useFinishCooking() {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  return useMutation({
    mutationFn: async ({
      recipeId,
      usedIngredients,
    }: {
      recipeId: string;
      usedIngredients: Array<{ name: string; amount: number; unit: string }>;
    }) => {
      const token = await getToken();
      return apiFetch<{ success: boolean }>(
        `/api/recipes/${recipeId}/finish-cooking`,
        { method: 'POST', body: JSON.stringify({ usedIngredients }) },
        token
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      showToast('Great job cooking! Pantry updated 🍳', 'success');
    },
    onError: () => {
      showToast('Failed to update pantry after cooking', 'error');
    },
  });
}
