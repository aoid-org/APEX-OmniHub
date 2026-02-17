import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from '../../src/lib/storage-adapter';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should set and get items', () => {
    adapter.setItem('test-key', 'test-value');
    expect(adapter.getItem('test-key')).toBe('test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('should remove items', () => {
    adapter.setItem('test-key', 'test-value');
    adapter.removeItem('test-key');
    expect(adapter.getItem('test-key')).toBeNull();
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('should clear all items', () => {
    adapter.setItem('key1', 'value1');
    adapter.setItem('key2', 'value2');
    adapter.clear();
    expect(adapter.getItem('key1')).toBeNull();
    expect(adapter.getItem('key2')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('should handle QuotaExceededError gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
      // Manually set properties to match browser behavior if needed,
      // although DOMException constructor usually handles name/message.
      // We explicitly set name to ensure it matches the check.
      Object.defineProperty(error, 'name', { value: 'QuotaExceededError' });
      Object.defineProperty(error, 'code', { value: 22 });
      throw error;
    });

    // We need to ensure localStorage has length > 0 for the check to pass in some implementations
    // but our mock implementation of setItem blocks adding.
    // However, the `isQuotaExceededError` check `localStorage.length !== 0` might fail if empty.
    // Let's mock length getter if needed, or just assume the test runs in an env where it works.
    // Actually, in jsdom, if we throw, nothing gets added.

    // Let's pre-fill to ensure length > 0 if that logic is strictly enforced
    // But since we are mocking setItem, we can't pre-fill using setItem easily if we mock it globally.
    // We will just try to trigger the catch block.

    // We need to temporarily restore setItem to fill it, then mock it?
    // Or just rely on the fact that `isQuotaExceededError` logic might be slightly different in test env.

    // Let's force the condition:
    Object.defineProperty(localStorage, 'length', { value: 1, configurable: true });

    adapter.setItem('key', 'huge-value');

    expect(setItemSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Storage quota exceeded, failed to write to localStorage');

    consoleSpy.mockRestore();
  });

  it('should return null if getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied');
    });

    expect(adapter.getItem('key')).toBeNull();
  });
});
