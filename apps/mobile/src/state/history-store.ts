import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { HistoryEntry } from '@ai-stylish/shared';
import { create } from 'zustand';

import { apiClient } from '@/api/client';

interface HistoryState {
  entries: HistoryEntry[];
  isLoading: boolean;
  error: string | null;
  fetchHistory: (token: string) => Promise<void>;
  clearError: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchHistory: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await apiClient.get<HistoryEntry[]>(API_ENDPOINTS.HISTORY, token);
      set({ entries, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load history',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
