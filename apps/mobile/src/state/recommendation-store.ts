import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { OutfitFeedback, RecommendationRun } from '@ai-stylish/shared';
import { create } from 'zustand';

import { ApiError, apiClient } from '@/api/client';
import * as storage from '@/lib/storage';
import { useSyncQueueStore } from '@/state/sync-queue-store';

const RECOMMENDATION_CACHE_KEY = 'ai_stylish_recommendation_cache';

interface RecommendationState {
  run: RecommendationRun | null;
  isLoading: boolean;
  isSubmittingFeedback: boolean;
  isFromCache: boolean;
  isOffline: boolean;
  error: string | null;
  hydrateFromCache: () => Promise<void>;
  generateToday: (token: string, lat?: number, lon?: number) => Promise<void>;
  submitFeedback: (
    token: string,
    outfitId: string,
    feedbackCode: OutfitFeedback,
    isFavorite?: boolean,
    wornAt?: string
  ) => Promise<void>;
  setRun: (run: RecommendationRun) => void;
  clearError: () => void;
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  run: null,
  isLoading: false,
  isSubmittingFeedback: false,
  isFromCache: false,
  isOffline: false,
  error: null,

  hydrateFromCache: async () => {
    const cached = await storage.getItem(RECOMMENDATION_CACHE_KEY);
    if (!cached) return;
    try {
      set({ run: JSON.parse(cached) as RecommendationRun, isFromCache: true });
    } catch {
      // corrupt cache entry, ignore
    }
  },

  generateToday: async (token, lat, lon) => {
    set({ isLoading: true, error: null });
    try {
      const query = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : '';
      const run = await apiClient.post<RecommendationRun>(
        `${API_ENDPOINTS.RECOMMENDATIONS_TODAY}${query}`,
        {},
        token
      );
      set({ run, isLoading: false, isFromCache: false, isOffline: false });
      await storage.setItem(RECOMMENDATION_CACHE_KEY, JSON.stringify(run));
      useSyncQueueStore.getState().flush(token);
    } catch (e) {
      const isNetworkFailure = e instanceof ApiError && e.status === 0;
      set({
        isLoading: false,
        isOffline: isNetworkFailure,
        error: isNetworkFailure ? null : e instanceof Error ? e.message : 'Failed to generate a recommendation',
      });
    }
  },

  submitFeedback: async (token, outfitId, feedbackCode, isFavorite, wornAt) => {
    const { run } = get();
    if (!run) return;
    set({ isSubmittingFeedback: true, error: null });
    try {
      await apiClient.post(
        API_ENDPOINTS.RECOMMENDATIONS_FEEDBACK(run.id),
        {
          outfit_id: outfitId,
          feedback_code: feedbackCode,
          is_favorite: isFavorite ?? false,
          worn_at: wornAt,
        },
        token
      );
      set({ isSubmittingFeedback: false });
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        // Offline: the outfit card already reflects the tap locally (its
        // own lastFeedback state), so just queue the write for replay
        // rather than surfacing a hard error for something the user will
        // never need to retry themselves.
        set({ isSubmittingFeedback: false });
        await useSyncQueueStore.getState().enqueue({
          object_type: 'outfit_feedback',
          object_id: outfitId,
          action: 'create',
          payload: { run_id: run.id, feedback_code: feedbackCode, is_favorite: isFavorite ?? false, worn_at: wornAt },
        });
        return;
      }
      set({
        isSubmittingFeedback: false,
        error: e instanceof ApiError ? e.message : 'Failed to submit feedback',
      });
      throw e;
    }
  },

  setRun: (run) => set({ run }),

  clearError: () => set({ error: null }),
}));
