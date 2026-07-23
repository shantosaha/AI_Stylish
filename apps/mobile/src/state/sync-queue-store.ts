import { API_ENDPOINTS } from '@ai-stylish/shared';
import type { SyncAction, SyncObjectType, SyncReplayResponse } from '@ai-stylish/shared';
import { create } from 'zustand';

import { apiClient } from '@/api/client';
import * as storage from '@/lib/storage';

const QUEUE_STORAGE_KEY = 'ai_stylish_sync_queue';

export interface QueuedMutation {
  id: string;
  object_type: SyncObjectType;
  object_id: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  client_queued_at: string;
}

interface SyncQueueState {
  queue: QueuedMutation[];
  isSyncing: boolean;
  conflicts: { objectId: string; detail: string }[];
  loadQueue: () => Promise<void>;
  enqueue: (mutation: Omit<QueuedMutation, 'id' | 'client_queued_at'>) => Promise<void>;
  flush: (token: string) => Promise<void>;
  clearConflicts: () => void;
}

function persist(queue: QueuedMutation[]): Promise<void> {
  return storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptReplay(queue: QueuedMutation[], token: string): Promise<SyncReplayResponse> {
  return apiClient.post<SyncReplayResponse>(
    API_ENDPOINTS.SYNC_REPLAY,
    {
      items: queue.map((q) => ({
        object_type: q.object_type,
        object_id: q.object_id,
        action: q.action,
        payload: q.payload,
        client_queued_at: q.client_queued_at,
      })),
    },
    token
  );
}

export const useSyncQueueStore = create<SyncQueueState>((set, get) => ({
  queue: [],
  isSyncing: false,
  conflicts: [],

  loadQueue: async () => {
    const cached = await storage.getItem(QUEUE_STORAGE_KEY);
    if (!cached) return;
    try {
      set({ queue: JSON.parse(cached) as QueuedMutation[] });
    } catch {
      // corrupt cache entry, ignore
    }
  },

  enqueue: async (mutation) => {
    const item: QueuedMutation = {
      ...mutation,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      client_queued_at: new Date().toISOString(),
    };
    const queue = [...get().queue, item];
    set({ queue });
    await persist(queue);
  },

  flush: async (token) => {
    const { queue, isSyncing } = get();
    if (queue.length === 0 || isSyncing) return;
    set({ isSyncing: true });

    // A connection that just came back can still be settling (this is
    // ordinary on mobile networks) - one short-delayed retry absorbs that
    // instead of leaving a fresh reconnection's first sync attempt stranded
    // until the next unrelated API call happens to trigger another flush.
    let response: SyncReplayResponse;
    try {
      response = await attemptReplay(queue, token);
    } catch {
      try {
        await sleep(3000);
        response = await attemptReplay(queue, token);
      } catch {
        // Still not reachable - leave the queue intact for the next
        // successful connection to retry.
        set({ isSyncing: false });
        return;
      }
    }

    const conflicts = response.results
      .filter((r) => r.status === 'failed')
      .map((r) => ({ objectId: r.object_id, detail: r.detail ?? 'Sync failed' }));
    // Every attempted item is cleared from the queue regardless of outcome
    // - a failure (e.g. a genuine conflict) surfaces via `conflicts`
    // instead of retrying forever with a payload that will never apply.
    set({ queue: [], isSyncing: false, conflicts });
    await persist([]);
  },

  clearConflicts: () => set({ conflicts: [] }),
}));
