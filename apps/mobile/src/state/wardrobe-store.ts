import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { UpdateWardrobeItemRequest, WardrobeItem } from '@ai-stylish/shared';
import { create } from 'zustand';

import { ApiError, apiClient } from '@/api/client';
import * as storage from '@/lib/storage';
import { useSyncQueueStore } from '@/state/sync-queue-store';

const WARDROBE_CACHE_KEY = 'ai_stylish_wardrobe_cache';

export interface PickedImage {
  uri: string;
  file?: File; // web only - the real Blob/File to upload
  mimeType?: string | null;
  fileName?: string | null;
}

interface WardrobeState {
  items: WardrobeItem[];
  isLoading: boolean;
  isMutating: boolean;
  isFromCache: boolean;
  isOffline: boolean;
  error: string | null;
  hydrateFromCache: () => Promise<void>;
  fetchItems: (token: string) => Promise<void>;
  createItem: (
    token: string,
    image: PickedImage,
    fields: { name?: string; category?: string }
  ) => Promise<WardrobeItem>;
  updateItem: (token: string, id: string, payload: UpdateWardrobeItemRequest) => Promise<void>;
  deleteItem: (token: string, id: string) => Promise<void>;
  clearError: () => void;
}

function buildImageFormData(image: PickedImage, fields: { name?: string; category?: string }): FormData {
  const formData = new FormData();
  if (image.file) {
    // Web: upload the real File/Blob directly.
    formData.append('image', image.file, image.fileName ?? 'photo.jpg');
  } else {
    // Native: RN's fetch accepts this {uri, name, type} shape for multipart parts.
    formData.append('image', {
      uri: image.uri,
      name: image.fileName ?? 'photo.jpg',
      type: image.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  if (fields.name) formData.append('name', fields.name);
  if (fields.category) formData.append('category', fields.category);
  return formData;
}

export const useWardrobeStore = create<WardrobeState>((set, get) => ({
  items: [],
  isLoading: false,
  isMutating: false,
  isFromCache: false,
  isOffline: false,
  error: null,

  hydrateFromCache: async () => {
    const cached = await storage.getItem(WARDROBE_CACHE_KEY);
    if (!cached) return;
    try {
      set({ items: JSON.parse(cached) as WardrobeItem[], isFromCache: true });
    } catch {
      // corrupt cache entry, ignore
    }
  },

  fetchItems: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const items = await apiClient.get<WardrobeItem[]>(API_ENDPOINTS.WARDROBE_ITEMS, token);
      set({ items, isLoading: false, isFromCache: false, isOffline: false });
      await storage.setItem(WARDROBE_CACHE_KEY, JSON.stringify(items));
      // Reaching the server proves connectivity is back - opportunistically
      // replay anything queued while offline.
      useSyncQueueStore.getState().flush(token);
    } catch (e) {
      const isNetworkFailure = e instanceof ApiError && e.status === 0;
      set({
        isLoading: false,
        isOffline: isNetworkFailure,
        error: isNetworkFailure ? null : e instanceof Error ? e.message : 'Failed to load wardrobe',
      });
    }
  },

  createItem: async (token, image, fields) => {
    set({ isMutating: true, error: null });
    try {
      const formData = buildImageFormData(image, fields);
      const item = await apiClient.postForm<WardrobeItem>(API_ENDPOINTS.WARDROBE_ITEMS, formData, token);
      const items = [item, ...get().items];
      set({ items, isMutating: false });
      await storage.setItem(WARDROBE_CACHE_KEY, JSON.stringify(items));
      return item;
    } catch (e) {
      set({ isMutating: false, error: e instanceof Error ? e.message : 'Failed to add item' });
      throw e;
    }
  },

  updateItem: async (token, id, payload) => {
    set({ isMutating: true, error: null });
    try {
      const updated = await apiClient.put<WardrobeItem>(API_ENDPOINTS.WARDROBE_ITEM_UPDATE(id), payload, token);
      const items = get().items.map((item) => (item.id === id ? updated : item));
      set({ items, isMutating: false });
      await storage.setItem(WARDROBE_CACHE_KEY, JSON.stringify(items));
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        // Offline: apply the edit optimistically so the user sees it take
        // effect immediately, and queue it for replay once back online
        // rather than losing the change or showing a hard error.
        const items = get().items.map((item) => (item.id === id ? ({ ...item, ...payload } as WardrobeItem) : item));
        set({ items, isMutating: false, error: null });
        await storage.setItem(WARDROBE_CACHE_KEY, JSON.stringify(items));
        await useSyncQueueStore.getState().enqueue({
          object_type: 'wardrobe_item',
          object_id: id,
          action: 'update',
          payload: payload as Record<string, unknown>,
        });
        return;
      }
      set({ isMutating: false, error: e instanceof Error ? e.message : 'Failed to save changes' });
      throw e;
    }
  },

  deleteItem: async (token, id) => {
    set({ isMutating: true, error: null });
    try {
      await apiClient.delete<void>(API_ENDPOINTS.WARDROBE_ITEM_DELETE(id), token);
      const items = get().items.filter((item) => item.id !== id);
      set({ items, isMutating: false });
      await storage.setItem(WARDROBE_CACHE_KEY, JSON.stringify(items));
    } catch (e) {
      set({ isMutating: false, error: e instanceof Error ? e.message : 'Failed to delete item' });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
