import { describe, expect, it, vi } from 'vitest';
import { getTinyPreference, migrateLocalStorageToDurableState, setTinyPreference } from '../../src/lib/apex/client-persistence';

describe('APEX client persistence contract', () => {
  it('keeps localStorage constrained to tiny non-critical preferences', () => {
    localStorage.clear();
    setTinyPreference('theme', 'dark');
    setTinyPreference('large_queue_payload', 'blocked');
    expect(getTinyPreference('theme')).toBe('dark');
    expect(localStorage.getItem('large_queue_payload')).toBeNull();
  });

  it('version-gates migration and discards unsafe legacy localStorage health state', async () => {
    localStorage.clear();
    localStorage.setItem('omni_sentry_health', JSON.stringify({ noisy: true }));
    const result = await migrateLocalStorageToDurableState();
    expect(result.discarded).toEqual(['omni_sentry_health']);
    expect(localStorage.getItem('omni_sentry_health')).toBeNull();
    await expect(migrateLocalStorageToDurableState()).resolves.toEqual({ imported: [], discarded: [] });
  });

  it('fails safe when IndexedDB is unavailable for queue import', async () => {
    localStorage.clear();
    localStorage.setItem('apex_queue_legacy', 'payload');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(migrateLocalStorageToDurableState()).rejects.toThrow();
    spy.mockRestore();
  });
});
