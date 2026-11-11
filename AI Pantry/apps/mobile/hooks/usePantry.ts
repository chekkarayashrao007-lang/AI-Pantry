import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchasedAt: string;
  expiresAt?: string | null;
  isExpired: boolean;
  confidenceScore?: number | null;
}

async function getToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export function usePantryItems() {
  return useQuery({
    queryKey: ['pantry'],
    queryFn: async () => {
      const token = await getToken();
      const result = await apiFetch<{ success: boolean; data: PantryItem[] }>(
        '/api/pantry',
        {},
        token
      );
      return result.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  return useMutation({
    mutationFn: async (item: Omit<PantryItem, 'id' | 'userId' | 'purchasedAt' | 'isExpired'>) => {
      const token = await getToken();
      return apiFetch<{ success: boolean; data: PantryItem }>(
        '/api/pantry',
        { method: 'POST', body: JSON.stringify(item) },
        token
      );
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['pantry'] });
      const previous = queryClient.getQueryData<PantryItem[]>(['pantry']);

      queryClient.setQueryData<PantryItem[]>(['pantry'], (old = []) => [
        ...old,
        {
          ...newItem,
          id: `temp-${Date.now()}`,
          userId: '',
          purchasedAt: new Date().toISOString(),
          isExpired: false,
        },
      ]);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['pantry'], context?.previous);
      showToast('Failed to add item', 'error');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      showToast('Item added to pantry!', 'success');
    },
  });
}

export function useBulkAddPantryItems() {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  return useMutation({
    mutationFn: async (items: Array<Omit<PantryItem, 'id' | 'userId' | 'purchasedAt' | 'isExpired'>>) => {
      const token = await getToken();
      return apiFetch<{ success: boolean; data: { count: number } }>(
        '/api/pantry/bulk',
        { method: 'POST', body: JSON.stringify({ items }) },
        token
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      showToast(`Added ${data.data.count} items to pantry!`, 'success');
    },
    onError: () => {
      showToast('Failed to add scanned items', 'error');
    },
  });
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiFetch<{ success: boolean }>(
        `/api/pantry/${id}`,
        { method: 'DELETE' },
        token
      );
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['pantry'] });
      const previous = queryClient.getQueryData<PantryItem[]>(['pantry']);
      queryClient.setQueryData<PantryItem[]>(['pantry'], (old = []) =>
        old.filter((item) => item.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['pantry'], context?.previous);
      showToast('Failed to delete item', 'error');
    },
    onSuccess: () => {
      showToast('Item removed from pantry', 'info');
    },
  });
}
