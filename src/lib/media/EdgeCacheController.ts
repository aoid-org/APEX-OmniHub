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
 * CORS proxy base URL for cross-origin media.
 * Routes external media through EdgeCORSProxy to guarantee
 * Access-Control-Allow-Origin headers for Web Audio API.
 */
const EDGE_CORS_PROXY_BASE = 'https://cors.apexomnihub.icu';
const EDGE_CORS_PROXY_TARGET_HOSTS = new Set([
  'apexomnihub.icu',
  'www.apexomnihub.icu',
  'assets.apexomnihub.icu',
  'media.apexomnihub.icu',
  'omnihub.dev',
  'staging.omnihub.dev',
  'wwajmaohwcbooljdureo.supabase.co',
]);

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function canUseEdgeCorsProxy(parsed: URL): boolean {
  const hostname = normalizeHostname(parsed.hostname);
  // Keep client routing aligned with the worker allowlist; unknown hosts load directly instead of through the public proxy.
  return EDGE_CORS_PROXY_TARGET_HOSTS.has(hostname) || (hostname.endsWith('.apexomnihub.icu') && hostname !== 'cors.apexomnihub.icu');
}

/**
 * Determines if a URL requires CORS proxying.
 * Same-origin, blob:, and data: URLs bypass the proxy.
 */
function requiresProxy(url: string): boolean {
  if (url.startsWith('blob:') || url.startsWith('data:')) return false;
  try {
    const parsed = new URL(url, globalThis.location?.origin);
    return parsed.origin !== globalThis.location?.origin && parsed.protocol === 'https:' && canUseEdgeCorsProxy(parsed);
  } catch {
    return false;
  }
}

/**
 * Wraps an external URL in the EdgeCORSProxy.
 * @returns Proxied URL for approved cross-origin sources, original URL otherwise.
 */
export function proxyMediaUrl(url: string): string {
  if (!requiresProxy(url)) return url;
  return `${EDGE_CORS_PROXY_BASE}/?source=${encodeURIComponent(url)}`;
}

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

    // Not cached yet — fetch via CORS proxy for external sources, cache for next access
    const fetchUrl = proxyMediaUrl(url);
    fetch(fetchUrl)
      .then((response) => {
        if (response.ok) {
          // Cache under original URL key for consistent lookups
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
