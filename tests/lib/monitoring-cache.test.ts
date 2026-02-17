import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logError, logPerformance, clearLogs, getErrorLogs, _testing } from '../../src/lib/monitoring';

describe('monitoring - in-memory cache', () => {
  beforeEach(() => {
    localStorage.clear();
    _testing.logCache.clear();
    _testing.queue.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    _testing.logCache.clear();
  });

  it('should cache logs in memory after first read', () => {
    const { logCache, getCachedLogs } = _testing;

    // Setup initial data in storage
    const initialData = [{ message: 'init' }];
    localStorage.setItem('error_logs', JSON.stringify(initialData));

    // First call - cache miss, loads from localStorage
    const logs1 = getCachedLogs('error_logs');
    expect(logCache.has('error_logs')).toBe(true);
    expect(logs1).toEqual(initialData);

    // Second call - cache hit, should return same instance
    const logs2 = getCachedLogs('error_logs');
    expect(logs1).toBe(logs2);  // Same array instance
  });

  it('should update cache on write', async () => {
    const { getCachedLogs } = _testing;

    await logError(new Error('test error'));

    // Force flush (logError triggers persistLog which might queue or directWrite depending on criticality)
    // logError is critical, so it directWrites immediately.

    // Cache should have the log
    const cached = getCachedLogs('error_logs');
    expect(cached.length).toBeGreaterThan(0);
    expect(cached[0].message).toBe('test error');

    // localStorage should match cache
    const fromStorage = JSON.parse(localStorage.getItem('error_logs') || '[]');
    expect(fromStorage).toEqual(cached);
  });

  it('should sync cache on storage event from other tab', () => {
    const { logCache, getCachedLogs } = _testing;

    // Populate cache first to ensure we see the update
    getCachedLogs('error_logs'); // ensures initialized

    // Simulate other tab writing
    const otherTabLogs = [{ message: 'from other tab' }];
    const newValue = JSON.stringify(otherTabLogs);
    localStorage.setItem('error_logs', newValue);

    // Trigger storage event (JSDOM does not auto-trigger this on same-window writes, and we need to simulate it)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'error_logs',
      newValue: newValue,
      storageArea: localStorage,
    }));

    // Cache should be updated
    const cached = getCachedLogs('error_logs');
    expect(cached).toEqual(otherTabLogs);
    expect(logCache.get('error_logs')).toEqual(otherTabLogs);
  });

  it('should clear cache when clearLogs is called', () => {
    const { logCache, getCachedLogs } = _testing;

    // Populate cache
    getCachedLogs('error_logs');
    expect(logCache.has('error_logs')).toBe(true);

    // Clear
    clearLogs();

    // Cache should be empty (entries deleted)
    expect(logCache.has('error_logs')).toBe(false);
  });

  it('should handle malformed JSON in storage event', () => {
    const { logCache } = _testing;

    // Trigger storage event with bad JSON
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'error_logs',
      newValue: '{bad json',
      storageArea: localStorage,
    }));

    // Should remove key from cache so next read tries to recover or start fresh
    expect(logCache.has('error_logs')).toBe(false);
  });
});
