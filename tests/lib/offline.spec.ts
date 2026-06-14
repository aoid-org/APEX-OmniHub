import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isOnline,
  setupOfflineListeners,
  queueOfflineRequest,
  processQueuedRequests,
  saveToLocalStorage,
  loadFromLocalStorage,
  _clearQueueForTests
} from '../../src/lib/offline';

function setNavigatorOnLine(onLine: boolean) {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    value: onLine,
    configurable: true,
  });
}

describe('offline utils', () => {
  let memoryStore: Record<string, string> = {};
  let simulateQuotaExceeded: ((key: string) => boolean) | null = null;
  let simulateOtherError: ((key: string) => boolean) | null = null;
  // Sequential counter ensures UUID uniqueness within a test run even when
  // multiple IDs are generated in the same millisecond (common in CI).
  let _uuidCounter = 0;

  beforeEach(() => {
    memoryStore = {};
    simulateQuotaExceeded = null;
    simulateOtherError = null;
    _uuidCounter = 0;

    // Mock navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true,
    });

    const ls = {
      getItem: (k: string) => memoryStore[k] || null,
      setItem: (k: string, v: string) => {
        if (simulateQuotaExceeded?.(k)) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        if (simulateOtherError?.(k)) {
          throw new Error('Some other error');
        }
        memoryStore[k] = v;
      },
      removeItem: (k: string) => { delete memoryStore[k]; },
      get length() { return Object.keys(memoryStore).length; },
      key: (i: number) => Object.keys(memoryStore)[i] || null,
    };

    const lsProxy = new Proxy(memoryStore, {
      get: (target, prop) => {
        if (typeof prop === 'string' && prop in ls) return (ls as Record<string, unknown>)[prop];
        return target[prop as string];
      },
      ownKeys: (target) => Object.keys(target),
      getOwnPropertyDescriptor: (target, prop) => {
        return { enumerable: true, configurable: true, value: target[prop as string] };
      }
    });

    Object.defineProperty(globalThis, 'localStorage', {
      value: lsProxy,
      configurable: true,
      writable: true,
    });

    // Reset crypto mocks — use a sequential counter so IDs are always unique
    // even when many items are enqueued within the same millisecond (CI speed).
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: () => `test-uuid-${++_uuidCounter}`,
        getRandomValues: (arr: Uint32Array) => {
          arr[0] = 0; // consistent jitter
          return arr;
        }
      },
      configurable: true,
      writable: true,
    });

    // Clear the internal queue (in-memory) and localStorage so each test
    // starts with a fully empty queue regardless of prior test state.
    _clearQueueForTests();
    globalThis.localStorage.setItem('offline_request_queue', '[]');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOnline', () => {
    it('returns true when navigator is online', () => {
      setNavigatorOnLine(true);
      expect(isOnline()).toBe(true);
    });

    it('returns false when navigator is offline', () => {
      setNavigatorOnLine(false);
      expect(isOnline()).toBe(false);
    });
  });

  describe('setupOfflineListeners', () => {
    it('adds and removes event listeners correctly', () => {
      const addEventListener = vi.spyOn(globalThis, 'addEventListener');
      const removeEventListener = vi.spyOn(globalThis, 'removeEventListener');

      const cleanup = setupOfflineListeners();

      expect(addEventListener).toHaveBeenCalledTimes(2);
      expect(addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

      cleanup();

      expect(removeEventListener).toHaveBeenCalledTimes(2);
      expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('calls callbacks when events fire', () => {
      const onOnline = vi.fn(() => {});
      const onOffline = vi.fn(() => {});

      const eventListeners: Record<string, EventListenerOrEventListenerObject[]> = {};

      vi.spyOn(globalThis, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
        if (!eventListeners[type]) eventListeners[type] = [];
        eventListeners[type].push(listener);
      });

      setupOfflineListeners(onOnline, onOffline);

      // Trigger online
      eventListeners['online']?.forEach((fn: EventListenerOrEventListenerObject) => { if (typeof fn === "function") { fn(new Event("test")); } else { fn.handleEvent(new Event("test")); } });
      expect(onOnline).toHaveBeenCalledTimes(1);

      // Trigger offline
      eventListeners['offline']?.forEach((fn: EventListenerOrEventListenerObject) => { if (typeof fn === "function") { fn(new Event("test")); } else { fn.handleEvent(new Event("test")); } });
      expect(onOffline).toHaveBeenCalledTimes(1);
    });
  });

  describe('localStorage utils', () => {
    it('saveToLocalStorage and loadFromLocalStorage work normally', () => {
      const data = { foo: 'bar' };
      const success = saveToLocalStorage('test-key', data);
      expect(success).toBe(true);

      const loaded = loadFromLocalStorage<{ foo: string }>('test-key');
      expect(loaded).toEqual(data);
    });

    it('loadFromLocalStorage returns null for missing key', () => {
      const loaded = loadFromLocalStorage('missing-key');
      expect(loaded).toBeNull();
    });

    it('loadFromLocalStorage returns null for invalid JSON', () => {
      globalThis.localStorage.setItem('invalid-json', '{ bad json');
      const loaded = loadFromLocalStorage('invalid-json');
      expect(loaded).toBeNull();
    });

    it('loadFromLocalStorage handles maxAge correctly', () => {
      const dateNowMock = vi.spyOn(Date, 'now');

      // Save data at time 1000
      dateNowMock.mockReturnValue(1000);
      saveToLocalStorage('age-test', { val: 1 });

      // Try loading at time 2000 with maxAge 500
      dateNowMock.mockReturnValue(2000);
      const loaded = loadFromLocalStorage('age-test', 500);
      expect(loaded).toBeNull();

      // Try loading at time 1100 with maxAge 500 (should succeed)
      dateNowMock.mockReturnValue(1100);
      saveToLocalStorage('age-test2', { val: 2 });
      const loaded2 = loadFromLocalStorage('age-test2', 500);
      expect(loaded2).toEqual({ val: 2 });

      dateNowMock.mockRestore();
    });

    it('saveToLocalStorage handles quota exceeded by clearing old data', () => {
      const dateNowMock = vi.spyOn(Date, 'now');
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Setup some old data (time 1000)
      dateNowMock.mockReturnValue(1000);
      saveToLocalStorage('old-data', { val: 'old' });
      memoryStore['offline_request_queue'] = JSON.stringify({ timestamp: 999999999 });

      // Setup some new data (time 2000)
      dateNowMock.mockReturnValue(2000);
      saveToLocalStorage('new-data', { val: 'new' });

      let threw = false;
      simulateQuotaExceeded = (key) => {
        if (key === 'trigger-quota-now' && !threw) {
          threw = true;
          return true;
        }
        return false;
      };

      const success = saveToLocalStorage('trigger-quota-now', { val: 'test' });

      expect(success).toBe(true);

      // 'old-data' should be removed since it's the oldest 25% (we have 2 items, 25% of 2 is 0.5 -> 1 item removed)
      expect(memoryStore['old-data']).toBeUndefined();
      expect(memoryStore['new-data']).toBeDefined();
      expect(memoryStore['trigger-quota-now']).toBeDefined();

      dateNowMock.mockRestore();
    });

    it('returns false when quota is exceeded and clear fails to fix', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      simulateQuotaExceeded = () => true;

      const success = saveToLocalStorage('trigger-fail', { val: 'test' });
      expect(success).toBe(false);
    });

    it('returns false for unknown save errors', () => {
      simulateOtherError = () => true;

      const success = saveToLocalStorage('trigger-fail', { val: 'test' });
      expect(success).toBe(false);
    });

    it('loadFromLocalStorage handles missing data property gracefully', () => {
       globalThis.localStorage.setItem('missing-data', JSON.stringify({ timestamp: Date.now() }));
       const loaded = loadFromLocalStorage('missing-data');
       expect(loaded).toBeUndefined(); // as data was not defined in the saved json
    });
  });

  describe('queueOfflineRequest & processQueuedRequests', () => {
    beforeEach(() => {
      _clearQueueForTests();
      localStorage.removeItem('offline_request_queue');
    });

    it('queues a request and persists it', () => {
      const req = vi.fn(() => Promise.resolve('ok'));
      const id = queueOfflineRequest(req);

      expect(typeof id).toBe("string");
      const rawQueue = globalThis.localStorage.getItem('offline_request_queue');
      expect(rawQueue).toBeTruthy();

      expect(rawQueue).toContain(id);
    });

    it('removes oldest request when queue is full', () => {
      // Reset queue to start fresh
      globalThis.localStorage.removeItem('offline_request_queue');
      _clearQueueForTests();
      // Mock console.warn to keep output clean
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Fill the queue up to MAX_QUEUE_SIZE (50)
      for (let i = 0; i < 50; i++) {
        queueOfflineRequest(vi.fn(() => Promise.resolve('ok')));
      }

      const rawQueueBefore = globalThis.localStorage.getItem('offline_request_queue');
      const queueBefore = JSON.parse(rawQueueBefore!);
      expect(queueBefore.length).toBe(50);
      const firstId = queueBefore[0].id;

      // Add one more
      const newId = queueOfflineRequest(vi.fn(() => Promise.resolve('ok')));

      const rawQueueAfter = globalThis.localStorage.getItem('offline_request_queue');
      const queueAfter = JSON.parse(rawQueueAfter!);

      expect(queueAfter.length).toBe(50); // Still 50
      expect(queueAfter.find((i: { id: string; retries: number; nextRetryTime?: number }) => i.id === firstId)).toBeUndefined(); // First item removed
      expect(queueAfter.find((i: { id: string; retries: number; nextRetryTime?: number }) => i.id === newId)).toBeDefined(); // New item added
    });

    it('processes queued requests successfully when online', async () => {
      setNavigatorOnLine(true);

      let callCount = 0;
      const req = vi.fn(() => {
        callCount++;
        return Promise.resolve('ok');
      });

      const id = queueOfflineRequest(req);

      await processQueuedRequests();

      expect(callCount).toBe(1);

      // Verify queue is empty in storage
      const rawQueue = globalThis.localStorage.getItem('offline_request_queue');
      expect(rawQueue).not.toContain(id); // Should be removed on success
    });

    it('does not process requests when offline', async () => {
      setNavigatorOnLine(false);

      const req = vi.fn(() => Promise.resolve('ok'));
      queueOfflineRequest(req);

      await processQueuedRequests();

      expect(req).not.toHaveBeenCalled();
    });

    it('handles failed requests with retries', async () => {
      setNavigatorOnLine(true);
      // Mock console.error
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const req = vi.fn(() => Promise.reject(new Error('error')));
      const id = queueOfflineRequest(req);

      // Process 1: fails, increments retry, sets nextRetryTime
      await processQueuedRequests();

      const rawQueue1 = globalThis.localStorage.getItem('offline_request_queue');
      expect(rawQueue1).toContain(id); // Still in queue because it failed

      const queue1 = JSON.parse(rawQueue1!);
      const item1 = queue1.find((i: { id: string; retries: number; nextRetryTime?: number }) => i.id === id);
      expect(item1.retries).toBe(1);
    });

    it('respects nextRetryTime', async () => {
      setNavigatorOnLine(true);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      let reqCalls = 0;
      const req = vi.fn(() => {
        reqCalls++;
        return Promise.reject(new Error('error'));
      });

      queueOfflineRequest(req);

      // Process 1: fails, sets nextRetryTime in future
      await processQueuedRequests();
      expect(reqCalls).toBe(1);

      // Process 2 immediately: should NOT call req again because nextRetryTime is future
      await processQueuedRequests();
      expect(reqCalls).toBe(1);

      // Fast forward time past nextRetryTime
      const dateNowMock = vi.spyOn(Date, 'now');
      dateNowMock.mockReturnValue(Date.now() + 100000);

      // Process 3: should call req again
      await processQueuedRequests();
      expect(reqCalls).toBe(2);

      dateNowMock.mockRestore();
    });

    it('stops retrying after MAX_RETRIES', async () => {
      setNavigatorOnLine(true);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      let reqCalls = 0;
      const req = vi.fn(() => {
        reqCalls++;
        return Promise.reject(new Error('error'));
      });

      const id = queueOfflineRequest(req);

      // We need to bypass the nextRetryTime for tests easily.
      const dateNowMock = vi.spyOn(Date, 'now');
      let simulatedTime = Date.now();
      dateNowMock.mockImplementation(() => simulatedTime);

      // MAX_RETRIES is 3 in the code.
      // Call 1 (retry 0 -> 1)
      await processQueuedRequests();
      simulatedTime += 100000;

      // Call 2 (retry 1 -> 2)
      await processQueuedRequests();
      simulatedTime += 100000;

      // Call 3 (retry 2 -> 3)
      await processQueuedRequests();
      simulatedTime += 100000;

      // Call 4: retries (3) is no longer < MAX_RETRIES, so the request is
      // attempted one final time and then dropped from the queue (not re-queued).
      await processQueuedRequests();

      // Initial attempt + MAX_RETRIES (3) re-attempts = 4 total invocations.
      expect(reqCalls).toBe(4);

      // The request has been dropped — further processing is a no-op.
      const callsAfterDrop = reqCalls;
      simulatedTime += 100000;
      await processQueuedRequests();
      expect(reqCalls).toBe(callsAfterDrop);

      // And it no longer persists in the offline queue.
      const rawQueue = globalThis.localStorage.getItem('offline_request_queue');
      expect(rawQueue === null || !rawQueue.includes(id)).toBe(true);

      dateNowMock.mockRestore();
    });
  });
});
