/**
 * Offline support and data persistence utilities.
 *
 * Uses serializable operation envelopes instead of raw functions so the
 * queue survives page reloads (localStorage round-trip safe).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface SerializableOp {
  id: string;
  createdAt: number;
  attempt: number;
  kind: string;
  payload: JsonValue;
}

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

export function isOnline(): boolean {
  return navigator.onLine;
}

export function setupOfflineListeners(
  onOnline?: () => void,
  onOffline?: () => void,
): () => void {
  const handleOnline = () => {
    console.log('[Offline] Connection restored');
    onOnline?.();
  };
  const handleOffline = () => {
    console.log('[Offline] Connection lost');
    onOffline?.();
  };

  globalThis.addEventListener('online', handleOnline);
  globalThis.addEventListener('offline', handleOffline);

  return () => {
    globalThis.removeEventListener('online', handleOnline);
    globalThis.removeEventListener('offline', handleOffline);
  };
}

// ---------------------------------------------------------------------------
// Executor registry — callers register handlers at import time
// ---------------------------------------------------------------------------

const executors = new Map<string, (payload: JsonValue) => Promise<void>>();

export function registerExecutor(kind: string, fn: (p: JsonValue) => Promise<void>): void {
  executors.set(kind, fn);
}

// ---------------------------------------------------------------------------
// Queue — localStorage backed, corruption-resistant
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'offline_queue';
const QUARANTINE_KEY = 'offline_queue_corrupted';
const MAX_QUEUE_SIZE = 50;
const MAX_ATTEMPTS = 3;

function safeGetQueue(): SerializableOp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SerializableOp[];
  } catch {
    // Quarantine corrupted data rather than crashing
    try {
      localStorage.setItem(QUARANTINE_KEY, localStorage.getItem(STORAGE_KEY) || '');
    } catch { /* best effort */ }
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function safeSetQueue(queue: SerializableOp[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Non-fatal: continue in-memory
  }
}

function removeFromQueue(id: string): void {
  const queue = safeGetQueue().filter((op) => op.id !== id);
  safeSetQueue(queue);
}

function quarantine(op: SerializableOp): void {
  try {
    const existing = JSON.parse(localStorage.getItem(QUARANTINE_KEY) || '[]');
    existing.push(op);
    localStorage.setItem(QUARANTINE_KEY, JSON.stringify(existing));
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function enqueue(op: Omit<SerializableOp, 'id' | 'createdAt' | 'attempt'>): string {
  const id = crypto.randomUUID();
  const fullOp: SerializableOp = {
    ...op,
    id,
    createdAt: Date.now(),
    attempt: 0,
  };
  const queue = safeGetQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift(); // Drop oldest when full
  }
  queue.push(fullOp);
  safeSetQueue(queue);
  return id;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function replay(): Promise<void> {
  if (!isOnline()) return;

  const queue = safeGetQueue();
  if (queue.length === 0) return;

  for (const op of queue) {
    const executor = executors.get(op.kind);
    if (!executor) {
      // No handler registered — keep in queue for next reload
      continue;
    }

    try {
      await executor(op.payload);
      removeFromQueue(op.id);
    } catch {
      op.attempt += 1;
      if (op.attempt >= MAX_ATTEMPTS) {
        quarantine(op);
        removeFromQueue(op.id);
      } else {
        // Exponential backoff + jitter
        const backoff = Math.pow(2, op.attempt) * 1000 + Math.random() * 1000;
        // Persist updated attempt count
        const updated = safeGetQueue().map((q) => (q.id === op.id ? { ...q, attempt: op.attempt } : q));
        safeSetQueue(updated);
        await sleep(backoff);
      }
    }
  }
}

/** Alias kept for backward compat with useOfflineSupport */
export const processQueuedRequests = replay;

// ---------------------------------------------------------------------------
// Local storage with quota management
// ---------------------------------------------------------------------------

export function saveToLocalStorage<T>(key: string, data: T): boolean {
  try {
    const serialized = JSON.stringify({ data, timestamp: Date.now() });
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearOldLocalStorageData();
      try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function loadFromLocalStorage<T>(key: string, maxAge?: number): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const { data, timestamp } = JSON.parse(item);
    if (maxAge && Date.now() - timestamp > maxAge) {
      localStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function clearOldLocalStorageData(): void {
  try {
    const keys = Object.keys(localStorage);
    const items = keys
      .map((key) => {
        try {
          const { timestamp } = JSON.parse(localStorage.getItem(key)!);
          return { key, timestamp: timestamp ?? 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const removeCount = Math.ceil(items.length * 0.25);
    items.slice(0, removeCount).forEach((item) => {
      try { localStorage.removeItem(item.key); } catch { /* ignore */ }
    });
  } catch {
    // non-fatal
  }
}
