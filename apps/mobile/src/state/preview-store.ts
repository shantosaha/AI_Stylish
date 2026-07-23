import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { PreviewAsset, PreviewType } from '@ai-stylish/shared';
import { create } from 'zustand';

import { apiClient } from '@/api/client';

interface PreviewState {
  // outfitId -> previewType -> asset
  assets: Record<string, Partial<Record<PreviewType, PreviewAsset>>>;
  loadingKey: string | null;
  error: string | null;
  generate: (
    token: string,
    outfitId: string,
    previewType: PreviewType,
    forceRefresh?: boolean
  ) => Promise<void>;
  clearError: () => void;
}

function key(outfitId: string, previewType: PreviewType): string {
  return `${outfitId}:${previewType}`;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  assets: {},
  loadingKey: null,
  error: null,

  generate: async (token, outfitId, previewType, forceRefresh) => {
    set({ loadingKey: key(outfitId, previewType), error: null });
    try {
      const asset = await apiClient.post<PreviewAsset>(
        API_ENDPOINTS.PREVIEW_GENERATE,
        { outfit_id: outfitId, preview_type: previewType, force_refresh: forceRefresh ?? false },
        token
      );
      set((state) => ({
        assets: {
          ...state.assets,
          [outfitId]: { ...state.assets[outfitId], [previewType]: asset },
        },
        loadingKey: null,
      }));
    } catch (e) {
      set({
        loadingKey: null,
        error: e instanceof Error ? e.message : 'Failed to generate preview',
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export function selectAsset(
  state: PreviewState,
  outfitId: string,
  previewType: PreviewType
): PreviewAsset | undefined {
  return state.assets[outfitId]?.[previewType];
}

export function isLoadingPreview(state: PreviewState, outfitId: string, previewType: PreviewType): boolean {
  return state.loadingKey === key(outfitId, previewType);
}
