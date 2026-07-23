import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { AuthResponse, UpdateProfileRequest, UserProfile } from '@ai-stylish/shared';
import { create } from 'zustand';

import { apiClient } from '@/api/client';
import * as storage from '@/lib/storage';

const TOKEN_KEY = 'ai_stylish_token';

interface AuthState {
  token: string | null;
  profile: UserProfile | null;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfileRequest) => Promise<void>;
  clearError: () => void;
}

async function fetchProfile(token: string): Promise<UserProfile> {
  return apiClient.get<UserProfile>(API_ENDPOINTS.PROFILE_GET, token);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  profile: null,
  isHydrated: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    const token = await storage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    try {
      const profile = await fetchProfile(token);
      set({ token, profile, isHydrated: true });
    } catch {
      await storage.deleteItem(TOKEN_KEY);
      set({ token: null, profile: null, isHydrated: true });
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH_SIGNUP, { email, password });
      await storage.setItem(TOKEN_KEY, res.access_token);
      const profile = await fetchProfile(res.access_token);
      set({ token: res.access_token, profile, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Signup failed' });
      throw e;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH_LOGIN, { email, password });
      await storage.setItem(TOKEN_KEY, res.access_token);
      const profile = await fetchProfile(res.access_token);
      set({ token: res.access_token, profile, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Login failed' });
      throw e;
    }
  },

  logout: async () => {
    await storage.deleteItem(TOKEN_KEY);
    set({ token: null, profile: null });
  },

  updateProfile: async (payload) => {
    const { token } = get();
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const profile = await apiClient.put<UserProfile>(API_ENDPOINTS.PROFILE_UPDATE, payload, token);
      set({ profile, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Update failed' });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
