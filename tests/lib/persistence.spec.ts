import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type OpenRequest = {
  result: {
    createObjectStore: () => void;
    transaction: (
      storeName: string,
      mode: IDBTransactionMode,
    ) => {
      objectStore: (name: string) => {
        get: (key: string) => {
          result: unknown;
          onsuccess: (() => void) | null;
          onerror: (() => void) | null;
        };
        put: (value: unknown, key: string) => void;
        delete: (key: string) => void;
      };
      oncomplete: (() => void) | null;
      onerror: (() => void) | null;
    };
  };
  error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onupgradeneeded: (() => void) | null;
};

const createObjectStoreMock = (store: Map<string, unknown>) => {
  return vi.fn(() => ({
    get: (key: string) => {
      const req = {
        result: store.get(key),
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
    put: (value: unknown, key: string) => {
      store.set(key, value);
    },
    delete: (key: string) => {
      store.delete(key);
    },
  }));
};

const createIndexedDbMock = () => {
  const store = new Map<string, unknown>();
  const objectStoreMock = createObjectStoreMock(store);

  const db = {
    createObjectStore: vi.fn(),
    transaction: vi.fn((_storeName: string, _mode: IDBTransactionMode) => {
      const tx = {
        objectStore: objectStoreMock,
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    }),
  };

  const open = vi.fn((_name: string, _version: number) => {
    const request: OpenRequest = {
      result: db,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    queueMicrotask(() => {
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  });

  return { open, store };
};

describe('persistence adapter', () => {
  const originalIndexedDB = (globalThis as unknown as { indexedDB?: unknown })
    .indexedDB;
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: originalIndexedDB,
    });

    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor);
    } else {
      delete (globalThis as unknown as Record<string, unknown>).localStorage;
    }
    vi.restoreAllMocks();
  });

  it('uses IndexedDB when available and caches DB connection', async () => {
    const idbMock = createIndexedDbMock();
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: { open: idbMock.open },
    });

    const mod = await import('@/libs/persistence');
    await mod.persistentSet('k1', { value: 1 });
    await mod.persistentSet('k2', { value: 2 });
    expect(idbMock.open).toHaveBeenCalledTimes(1);

    await expect(mod.persistentGet<{ value: number }>('k1')).resolves.toEqual({
      value: 1,
    });

    await mod.persistentDelete('k1');
    await expect(mod.persistentGet('k1')).resolves.toBeNull();
  });

  it('falls back to localStorage when IndexedDB is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
    });

    const mod = await import('@/libs/persistence');
    await mod.persistentSet('local-key', { ok: true });
    await expect(mod.persistentGet<{ ok: boolean }>('local-key')).resolves.toEqual({
      ok: true,
    });

    await mod.persistentDelete('local-key');
    await expect(mod.persistentGet('local-key')).resolves.toBeNull();
  });

  it('falls back to in-memory storage when localStorage is unavailable', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage blocked');
      },
    });

    const mod = await import('@/libs/persistence');
    await mod.persistentSet('memory-key', { path: 'memory' });
    await expect(
      mod.persistentGet<{ path: string }>('memory-key'),
    ).resolves.toEqual({ path: 'memory' });

    await mod.persistentDelete('memory-key');
    await expect(mod.persistentGet('memory-key')).resolves.toBeNull();
  });

  it('handles IndexedDB open errors gracefully', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: {
        open: vi.fn(() => {
          const request = {
            result: null,
            error: new Error('open failed'),
            onsuccess: null as (() => void) | null,
            onerror: null as (() => void) | null,
            onupgradeneeded: null as (() => void) | null,
          };
          queueMicrotask(() => request.onerror?.());
          return request;
        }),
      },
    });

    const mod = await import('@/libs/persistence');
    await mod.persistentSet('k', 'v');
    await expect(mod.persistentGet('k')).resolves.toBe('v');
  });
});

