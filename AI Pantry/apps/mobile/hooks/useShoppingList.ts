import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

export interface ShoppingItem {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isBought: boolean;
}

async function getToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export function useShoppingList() {
  return useQuery({
    queryKey: ['shopping'],
    queryFn: async () => {
      const token = await getToken();
      const result = await apiFetch<{ success: boolean; data: ShoppingItem[] }>(
        '/api/shopping',
        {},
        token
      );
      return result.data;
    },
  });
}

export function useToggleShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiFetch<{ success: boolean; data: ShoppingItem }>(
        `/api/shopping/${id}/toggle`,
        { method: 'PATCH' },
        token
      );
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['shopping'] });
      const previous = queryClient.getQueryData<ShoppingItem[]>(['shopping']);
      queryClient.setQueryData<ShoppingItem[]>(['shopping'], (old = []) =>
        old.map((item) => (item.id === id ? { ...item, isBought: !item.isBought } : item))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['shopping'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

export function useAddToShoppingList() {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  return useMutation({
    mutationFn: async (item: { name: string; quantity?: number; unit?: string; category?: string }) => {
      const token = await getToken();
      return apiFetch<{ success: boolean; data: ShoppingItem }>(
        '/api/shopping',
        { method: 'POST', body: JSON.stringify(item) },
        token
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
      showToast('Added to shopping list', 'success');
    },
  });
}

export function useAddRecipeToShoppingList() {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  return useMutation({
    mutationFn: async (missingIngredients: string[]) => {
      const token = await getToken();
      return apiFetch<{ success: boolean; data: { count: number } }>(
        '/api/shopping/bulk-from-recipe',
        {
          method: 'POST',
          body: JSON.stringify({
            items: missingIngredients.map((name) => ({ name, quantity: 1, unit: 'pcs' })),
          }),
        },
        token
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
      showToast(`Added ${data.data.count} items to shopping list`, 'success');
    },
    onError: () => {
      showToast('Failed to add items to shopping list', 'error');
    },
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiFetch<{ success: boolean }>(
        `/api/shopping/${id}`,
        { method: 'DELETE' },
        token
      );
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['shopping'] });
      const previous = queryClient.getQueryData<ShoppingItem[]>(['shopping']);
      queryClient.setQueryData<ShoppingItem[]>(['shopping'], (old = []) =>
        old.filter((item) => item.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['shopping'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}
