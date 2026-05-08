const DB_NAME = 'apex-control-plane';
const DB_VERSION = 1;
const META_STORE = 'metadata';
const QUEUE_STORE = 'queues';
const MIGRATION_KEY = 'apex_storage_migration_v1';
const TINY_PREF_KEYS = new Set(['theme', 'apex_locale', 'OMNIDASH_ENABLED', 'apex_cooldown_consent']);

export type ApexDurableStore = 'metadata' | 'queues';

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDB()) return Promise.reject(new Error('indexeddb_unavailable'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexeddb_open_failed'));
  });
}

async function withStore<T>(storeName: ApexDurableStore, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = fn(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('indexeddb_request_failed'));
      tx.onerror = () => reject(tx.error ?? new Error('indexeddb_tx_failed'));
    });
  } finally {
    db.close();
  }
}

export async function durableGet<T>(store: ApexDurableStore, key: IDBValidKey): Promise<T | undefined> {
  return withStore<T | undefined>(store, 'readonly', (objectStore) => objectStore.get(key));
}

export async function durablePut<T>(store: ApexDurableStore, key: IDBValidKey, value: T): Promise<void> {
  if (store === QUEUE_STORE && typeof value === 'object' && value !== null) {
    await withStore(store, 'readwrite', (objectStore) => objectStore.put({ ...(value as Record<string, unknown>), id: key }));
    return;
  }
  await withStore(store, 'readwrite', (objectStore) => objectStore.put(value, key));
}

export function getTinyPreference(key: string): string | null {
  if (!TINY_PREF_KEYS.has(key) || typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

export function setTinyPreference(key: string, value: string): void {
  if (!TINY_PREF_KEYS.has(key) || typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

export async function cacheResponse(request: RequestInfo | URL, response: Response, cacheName = 'apex-runtime-v1'): Promise<void> {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

export async function matchCachedResponse(request: RequestInfo | URL, cacheName = 'apex-runtime-v1'): Promise<Response | undefined> {
  if (typeof caches === 'undefined') return undefined;
  const cache = await caches.open(cacheName);
  return cache.match(request);
}

export async function migrateLocalStorageToDurableState(): Promise<{ imported: string[]; discarded: string[] }> {
  const imported: string[] = [];
  const discarded: string[] = [];
  if (typeof localStorage === 'undefined' || localStorage.getItem(MIGRATION_KEY) === 'done') return { imported, discarded };
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => Boolean(key));
  for (const key of keys) {
    if (TINY_PREF_KEYS.has(key) || key === MIGRATION_KEY) continue;
    const value = localStorage.getItem(key);
    if (value === null) continue;
    if (key.startsWith('apex_queue_') || key.startsWith('omni_sentry_offline')) {
      await durablePut(META_STORE, key, { imported_at: new Date().toISOString(), value });
      localStorage.removeItem(key);
      imported.push(key);
    } else if (key.startsWith('omni_sentry_errors') || key.startsWith('omni_sentry_health')) {
      localStorage.removeItem(key);
      discarded.push(key);
    }
  }
  localStorage.setItem(MIGRATION_KEY, 'done');
  return { imported, discarded };
}
