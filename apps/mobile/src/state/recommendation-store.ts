import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { OutfitFeedback, RecommendationRun } from '@ai-stylish/shared';
import { create } from 'zustand';

import { ApiError, apiClient } from '@/api/client';

interface RecommendationState {
  run: RecommendationRun | null;
  isLoading: boolean;
  isSubmittingFeedback: boolean;
  error: string | null;
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
  error: null,

  generateToday: async (token, lat, lon) => {
    set({ isLoading: true, error: null });
    try {
      const query = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : '';
      const run = await apiClient.post<RecommendationRun>(
        `${API_ENDPOINTS.RECOMMENDATIONS_TODAY}${query}`,
        {},
        token
      );
      set({ run, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Failed to generate a recommendation',
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
