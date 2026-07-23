import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { UpdateWardrobeItemRequest, WardrobeItem } from '@ai-stylish/shared';
import { create } from 'zustand';

import { apiClient } from '@/api/client';

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
  error: string | null;
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
  error: null,

  fetchItems: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const items = await apiClient.get<WardrobeItem[]>(API_ENDPOINTS.WARDROBE_ITEMS, token);
      set({ items, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load wardrobe' });
    }
  },

  createItem: async (token, image, fields) => {
    set({ isMutating: true, error: null });
    try {
      const formData = buildImageFormData(image, fields);
      const item = await apiClient.postForm<WardrobeItem>(API_ENDPOINTS.WARDROBE_ITEMS, formData, token);
      set({ items: [item, ...get().items], isMutating: false });
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
      set({
        items: get().items.map((item) => (item.id === id ? updated : item)),
        isMutating: false,
      });
    } catch (e) {
      set({ isMutating: false, error: e instanceof Error ? e.message : 'Failed to save changes' });
      throw e;
    }
  },

  deleteItem: async (token, id) => {
    set({ isMutating: true, error: null });
    try {
      await apiClient.delete<void>(API_ENDPOINTS.WARDROBE_ITEM_DELETE(id), token);
      set({ items: get().items.filter((item) => item.id !== id), isMutating: false });
    } catch (e) {
      set({ isMutating: false, error: e instanceof Error ? e.message : 'Failed to delete item' });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
