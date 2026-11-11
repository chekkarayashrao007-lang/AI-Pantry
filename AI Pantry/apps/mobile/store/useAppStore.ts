import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppStore {
  // Auth state
  session: Session | null;
  user: User | null;
  isAuthLoading: boolean;
  setSession: (session: Session | null) => void;

  // Toast notifications
  toasts: ToastMessage[];
  showToast: (message: string, type: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;

  // Scanning state
  isScanningPantry: boolean;
  setScanningPantry: (value: boolean) => void;

  // Cooking mode
  activeCookingRecipeId: string | null;
  setActiveCookingRecipe: (id: string | null) => void;

  // Offline mode
  isOffline: boolean;
  setOffline: (value: boolean) => void;

  // Sign out
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set) => ({
  // Auth
  session: null,
  user: null,
  isAuthLoading: true,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, isAuthLoading: false }),

  // Toasts
  toasts: [],
  showToast: (message, type) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: Date.now().toString(), message, type },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Scanning
  isScanningPantry: false,
  setScanningPantry: (value) => set({ isScanningPantry: value }),

  // Cooking mode
  activeCookingRecipeId: null,
  setActiveCookingRecipe: (id) => set({ activeCookingRecipeId: id }),

  // Offline
  isOffline: false,
  setOffline: (value) => set({ isOffline: value }),

  // Sign out
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
