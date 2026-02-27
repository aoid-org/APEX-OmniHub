/**
 * EdgeCacheController — Client-Side Media Buffering Layer
 * @version 1.0.0
 * @module src/lib/media/EdgeCacheController
 *
 * Uses browser Cache API to store media locally after first fetch.
 * Subsequent accesses serve from client disk via Blob URL — zero server bandwidth.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Cache writes keyed by URL — re-caching is a harmless no-op
 * - Memory Safety: revokeCachedBlobUrl() prevents Blob URL accumulation
 * - Enterprise Performance: Serve from local disk; async background caching
 * - Regression-Free: Graceful degradation if Cache API unavailable
 * - Modularity: Pure utility — no React, no hooks, no state
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

const DEFAULT_CACHE_KEY = 'omni-media-v1';

/**
 * Prefetch and cache media at the given URL.
 *
 * @returns A blob: URL if the media is already cached locally,
 *          otherwise the original URL (while caching in background).
 */
export async function prefetchAndCacheMedia(
  url: string,
  cacheKey: string = DEFAULT_CACHE_KEY,
): Promise<string> {
  if (!('caches' in globalThis)) return url;

  try {
    const cache = await caches.open(cacheKey);
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      // Serve entirely from client disk — zero network
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }

    // Not cached yet — fetch in background, cache for next access
    fetch(url)
      .then((response) => {
        if (response.ok) {
          return cache.put(url, response.clone());
        }
        return undefined;
      })
      .catch((err: unknown) => {
        console.warn('[OmniMedia] Background cache write failed:', err);
      });

    return url;
  } catch (err: unknown) {
    console.warn('[OmniMedia] Client-side caching failed, falling back to network stream.', err);
    return url;
  }
}

/**
 * Revoke a previously created Blob URL to free memory.
 * Safe to call with non-blob URLs (no-op).
 */
export function revokeCachedBlobUrl(blobUrl: string): void {
  if (blobUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Revoking an already-revoked URL is a harmless no-op
    }
  }
}
