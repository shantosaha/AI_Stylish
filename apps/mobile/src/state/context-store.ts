import { API_ENDPOINTS } from '@ai-stylish/shared';
import type {
  CalendarEventSyncItem,
  ContextSnapshot,
  CreateRoutineRequest,
  RoutineBlock,
  UpdateCalendarEventRequest,
} from '@ai-stylish/shared';
import { create } from 'zustand';

import { ApiError, apiClient } from '@/api/client';
import * as storage from '@/lib/storage';

const CONTEXT_CACHE_KEY = 'ai_stylish_context_cache';

interface ContextState {
  snapshot: ContextSnapshot | null;
  routines: RoutineBlock[];
  isLoading: boolean;
  isFromCache: boolean;
  isOffline: boolean;
  error: string | null;
  hydrateFromCache: () => Promise<void>;
  fetchToday: (token: string, lat?: number, lon?: number) => Promise<void>;
  syncCalendarEvents: (token: string, events: CalendarEventSyncItem[]) => Promise<void>;
  updateEvent: (token: string, id: string, payload: UpdateCalendarEventRequest) => Promise<void>;
  deleteEvent: (token: string, id: string) => Promise<void>;
  fetchRoutines: (token: string) => Promise<void>;
  addRoutine: (token: string, payload: CreateRoutineRequest) => Promise<void>;
  deleteRoutine: (token: string, id: string) => Promise<void>;
  clearError: () => void;
}

export const useContextStore = create<ContextState>((set, get) => ({
  snapshot: null,
  routines: [],
  isLoading: false,
  isFromCache: false,
  isOffline: false,
  error: null,

  hydrateFromCache: async () => {
    const cached = await storage.getItem(CONTEXT_CACHE_KEY);
    if (!cached) return;
    try {
      const { snapshot } = JSON.parse(cached) as { snapshot: ContextSnapshot };
      set({ snapshot, isFromCache: true });
    } catch {
      // corrupt cache entry, ignore
    }
  },

  fetchToday: async (token, lat, lon) => {
    set({ isLoading: true, error: null });
    try {
      const query = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : '';
      const snapshot = await apiClient.get<ContextSnapshot>(`${API_ENDPOINTS.CONTEXT_TODAY}${query}`, token);
      set({ snapshot, isFromCache: false, isOffline: false, isLoading: false });
      await storage.setItem(
        CONTEXT_CACHE_KEY,
        JSON.stringify({ snapshot, cachedAt: new Date().toISOString() })
      );
    } catch (e) {
      const isNetworkFailure = e instanceof ApiError && e.status === 0;
      set({
        isLoading: false,
        isOffline: isNetworkFailure,
        error: isNetworkFailure ? null : e instanceof Error ? e.message : 'Failed to load context',
      });
    }
  },

  syncCalendarEvents: async (token, events) => {
    set({ error: null });
    try {
      await apiClient.post(API_ENDPOINTS.CALENDAR_EVENTS_SYNC, { events }, token);
      const todaysEvents = await apiClient.get(API_ENDPOINTS.CALENDAR_EVENTS_TODAY, token);
      const { snapshot } = get();
      if (snapshot) {
        set({ snapshot: { ...snapshot, events: todaysEvents as ContextSnapshot['events'] } });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to sync events' });
      throw e;
    }
  },

  updateEvent: async (token, id, payload) => {
    set({ error: null });
    try {
      const updated = await apiClient.put(API_ENDPOINTS.CALENDAR_EVENT_UPDATE(id), payload, token);
      const { snapshot } = get();
      if (snapshot) {
        set({
          snapshot: {
            ...snapshot,
            events: snapshot.events.map((e) =>
              e.id === id ? (updated as ContextSnapshot['events'][number]) : e
            ),
          },
        });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to save changes' });
      throw e;
    }
  },

  deleteEvent: async (token, id) => {
    set({ error: null });
    try {
      await apiClient.delete<void>(API_ENDPOINTS.CALENDAR_EVENT_DELETE(id), token);
      const { snapshot } = get();
      if (snapshot) {
        set({ snapshot: { ...snapshot, events: snapshot.events.filter((e) => e.id !== id) } });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete event' });
      throw e;
    }
  },

  fetchRoutines: async (token) => {
    try {
      const routines = await apiClient.get<RoutineBlock[]>(API_ENDPOINTS.ROUTINES, token);
      set({ routines });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load routines' });
    }
  },

  addRoutine: async (token, payload) => {
    set({ error: null });
    try {
      const routine = await apiClient.post<RoutineBlock>(API_ENDPOINTS.ROUTINES, payload, token);
      set({ routines: [routine, ...get().routines] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to add routine' });
      throw e;
    }
  },

  deleteRoutine: async (token, id) => {
    set({ error: null });
    try {
      await apiClient.delete<void>(API_ENDPOINTS.ROUTINE_DELETE(id), token);
      set({ routines: get().routines.filter((r) => r.id !== id) });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to delete routine' });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
