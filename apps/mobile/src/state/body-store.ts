import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { BodyAnalysisResult, BodyImage, UpdateBodyAnalysisRequest } from '@ai-stylish/shared';
import { create } from 'zustand';

import { ApiError, apiClient } from '@/api/client';
import type { PickedImage } from '@/state/wardrobe-store';

interface BodyState {
  images: BodyImage[];
  analysis: BodyAnalysisResult | null;
  isLoading: boolean;
  isUploading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  fetchAll: (token: string) => Promise<void>;
  uploadImage: (token: string, image: PickedImage) => Promise<void>;
  deleteImage: (token: string, id: string) => Promise<void>;
  runAnalysis: (token: string) => Promise<void>;
  updateAnalysis: (token: string, payload: UpdateBodyAnalysisRequest) => Promise<void>;
  clearError: () => void;
}

function buildImageFormData(image: PickedImage): FormData {
  const formData = new FormData();
  if (image.file) {
    formData.append('image', image.file, image.fileName ?? 'photo.jpg');
  } else {
    formData.append('image', {
      uri: image.uri,
      name: image.fileName ?? 'photo.jpg',
      type: image.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  return formData;
}

export const useBodyStore = create<BodyState>((set, get) => ({
  images: [],
  analysis: null,
  isLoading: false,
  isUploading: false,
  isAnalyzing: false,
  error: null,

  fetchAll: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const images = await apiClient.get<BodyImage[]>(API_ENDPOINTS.BODY_IMAGES, token);
      let analysis: BodyAnalysisResult | null = null;
      try {
        analysis = await apiClient.get<BodyAnalysisResult>(API_ENDPOINTS.BODY_ANALYSIS_GET, token);
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 404) throw e;
      }
      set({ images, analysis, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load body profile' });
    }
  },

  uploadImage: async (token, image) => {
    set({ isUploading: true, error: null });
    try {
      const formData = buildImageFormData(image);
      const uploaded = await apiClient.postForm<BodyImage>(API_ENDPOINTS.BODY_IMAGES, formData, token);
      set({ images: [...get().images, uploaded], isUploading: false });
    } catch (e) {
      set({ isUploading: false, error: e instanceof Error ? e.message : 'Failed to upload photo' });
      throw e;
    }
  },

  deleteImage: async (token, id) => {
    set({ error: null });
    try {
      await apiClient.delete<void>(API_ENDPOINTS.BODY_IMAGE_DELETE(id), token);
      set({ images: get().images.filter((img) => img.id !== id) });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete photo' });
      throw e;
    }
  },

  runAnalysis: async (token) => {
    set({ isAnalyzing: true, error: null });
    try {
      const analysis = await apiClient.post<BodyAnalysisResult>(API_ENDPOINTS.BODY_ANALYSIS_RUN, {}, token);
      set({ analysis, isAnalyzing: false });
    } catch (e) {
      set({ isAnalyzing: false, error: e instanceof Error ? e.message : 'Analysis failed' });
      throw e;
    }
  },

  updateAnalysis: async (token, payload) => {
    set({ error: null });
    try {
      const analysis = await apiClient.put<BodyAnalysisResult>(API_ENDPOINTS.BODY_ANALYSIS_UPDATE, payload, token);
      set({ analysis });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to save changes' });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
