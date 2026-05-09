import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cachedFetch, clearCache, getCacheStats, stopCleanup } from '@/lib/request-cache';

vi.mock('@/guardian/heartbeat', () => ({
  recordLoopHeartbeat: vi.fn(),
}));

describe('request-cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    clearCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    stopCleanup();
    // Restart cleanup just in case other tests expect it
    // But since it runs on import, we leave it stopped for cleanliness
  });

  it('should fetch and cache successful GET requests', async () => {
    const mockData = { id: 1 };
    const fetchMock = vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as unknown);

    const result1 = await cachedFetch('https://api.example.com/data');
    expect(result1).toEqual(mockData);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const result2 = await cachedFetch('https://api.example.com/data');
    expect(result2).toEqual(mockData);
    // Fetch should not be called again
    expect(fetchMock).toHaveBeenCalledTimes(1);
    
    expect(getCacheStats().cacheSize).toBe(1);
  });

  it('should not cache POST requests', async () => {
    const mockData = { success: true };
    const fetchMock = vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as unknown);

    const options = { method: 'POST', body: 'test' };
    await cachedFetch('https://api.example.com/data', options);
    await cachedFetch('https://api.example.com/data', options);

    // Fetch should be called twice since it's a POST
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getCacheStats().cacheSize).toBe(0);
  });

  it('should deduplicate concurrent requests (request coalescing)', async () => {
    let resolveDns: (val: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveDns = resolve;
    });

    const fetchMock = vi.mocked(globalThis.fetch).mockReturnValueOnce(fetchPromise as unknown);

    const p1 = cachedFetch('https://api.example.com/data');
    const p2 = cachedFetch('https://api.example.com/data');

    expect(getCacheStats().pendingRequests).toBe(1);

    resolveDns!({ ok: true, json: () => Promise.resolve({ data: 'ok' }) });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ data: 'ok' });
    expect(r2).toEqual({ data: 'ok' });

    // Only one external request should be made
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getCacheStats().pendingRequests).toBe(0);
  });

  it('should throw and not cache on HTTP error', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown);

    await expect(cachedFetch('https://api.example.com/fail')).rejects.toThrow('HTTP error! status: 404');
    expect(getCacheStats().cacheSize).toBe(0);
    expect(getCacheStats().pendingRequests).toBe(0);
  });

  it('should throw and cleanup pending requests on network error', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

    await expect(cachedFetch('https://api.example.com/network')).rejects.toThrow('Network error');
    expect(getCacheStats().cacheSize).toBe(0);
    expect(getCacheStats().pendingRequests).toBe(0);
  });

  it('should delete expired cache entries on retrieval', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'ok' }),
    } as unknown);

    await cachedFetch('https://api.example.com/data', undefined, 1000); // 1s TTL
    expect(getCacheStats().cacheSize).toBe(1);

    vi.advanceTimersByTime(2000); // Wait 2s

    await cachedFetch('https://api.example.com/data', undefined, 1000);
    // Should have cleared the cache and re-fetched
    expect(getCacheStats().cacheSize).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('should clear specific cache pattern', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as unknown);

    await cachedFetch('https://api.example.com/users');
    await cachedFetch('https://api.example.com/posts');

    expect(getCacheStats().cacheSize).toBe(2);

    clearCache('users');

    expect(getCacheStats().cacheSize).toBe(1);
  });
});
