/**
 * lib/media/EdgeCacheController.ts — Deterministic LRU Cache Governor
 * 250 MB ceiling · localStorage ledger · fail-safe quota protection
 * APEX-OmniHub v1.3.0-RC
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CACHE_STORE = 'omni-media-v1';
const LEDGER_KEY = 'apex_omni_cache_ledger';
const MAX_BYTES = 250 * 1024 * 1024; // 250 MB hard ceiling

// ---------------------------------------------------------------------------
// Ledger types
// ---------------------------------------------------------------------------
interface LedgerEntry {
  url: string;
  sizeBytes: number;
  lastAccessed: number;
  createdAt: number;
}

interface Ledger {
  [cacheKey: string]: LedgerEntry;
}

// ---------------------------------------------------------------------------
// EdgeCacheController
// ---------------------------------------------------------------------------
class EdgeCacheController {
  // -----------------------------------------------------------------------
  // Ledger persistence
  // -----------------------------------------------------------------------
  private loadLedger(): Ledger {
    try {
      const raw = localStorage.getItem(LEDGER_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Ledger;
    } catch {
      return {};
    }
  }

  /**
   * Persist the ledger. Returns false when localStorage quota is exceeded.
   */
  private saveLedger(ledger: Ledger): boolean {
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // LRU eviction
  // -----------------------------------------------------------------------
  private getTotalBytes(ledger: Ledger): number {
    let total = 0;
    for (const key of Object.keys(ledger)) {
      total += ledger[key].sizeBytes;
    }
    return total;
  }

  /**
   * Evict LRU-first entries until totalBytes ≤ MAX_BYTES.
   */
  private async enforceMemoryCeiling(ledger: Ledger): Promise<Ledger> {
    let totalBytes = this.getTotalBytes(ledger);
    if (totalBytes <= MAX_BYTES) return ledger;

    // Sort ascending by lastAccessed — oldest (least-recently-used) first
    const entries = Object.entries(ledger).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    );

    let cache: Cache | undefined;
    try {
      cache = await caches.open(CACHE_STORE);
    } catch {
      // Cache API unavailable — wipe ledger as fallback
      return {};
    }

    for (const [key, entry] of entries) {
      if (totalBytes <= MAX_BYTES) break;

      try {
        await cache.delete(key);
      } catch {
        // Best-effort deletion
      }

      totalBytes -= entry.sizeBytes;
      delete ledger[key];
    }

    this.saveLedger(ledger);
    return ledger;
  }

  // -----------------------------------------------------------------------
  // Fetch URL helper
  // -----------------------------------------------------------------------
  private buildFetchUrl(sourceUrl: string): string {
    if (typeof window === 'undefined') return sourceUrl;
    const isExternal =
      sourceUrl.startsWith('http') &&
      !sourceUrl.includes(window.location.host);
    if (!isExternal) return sourceUrl;
    return `/api/cors?source=${encodeURIComponent(sourceUrl)}`;
  }

  // -----------------------------------------------------------------------
  // Public API — SIGNATURE FROZEN
  // -----------------------------------------------------------------------

  /**
   * Returns a blob object URL for the given source.
   *
   * Cache-hit path → touch ledger, return blob URL.
   * Cache-miss path → fetch via CORS proxy, cache only HTTP 200, persist
   *   ledger, enforce ceiling. Falls back to fetchUrl on any error.
   */
  async proxyMediaUrl(sourceUrl: string): Promise<string> {
    const fetchUrl = this.buildFetchUrl(sourceUrl);

    try {
      const cache = await caches.open(CACHE_STORE);
      let ledger = this.loadLedger();

      // --- Cache hit ---------------------------------------------------
      const cachedResponse = await cache.match(sourceUrl);
      if (cachedResponse) {
        if (ledger[sourceUrl]) {
          ledger[sourceUrl].lastAccessed = Date.now();
          this.saveLedger(ledger);
        }
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }

      // --- Cache miss --------------------------------------------------
      const networkResponse = await fetch(fetchUrl);

      // Only cache full 200 responses — never 206 partial content
      if (networkResponse.status !== 200) {
        const blob = await networkResponse.blob();
        return URL.createObjectURL(blob);
      }

      // Clone before consuming the body
      const responseToCache = networkResponse.clone();
      const blob = await networkResponse.blob();
      const sizeBytes = blob.size;

      // Persist into Cache API
      await cache.put(sourceUrl, responseToCache);

      // Update ledger
      const now = Date.now();
      ledger[sourceUrl] = {
        url: sourceUrl,
        sizeBytes,
        lastAccessed: now,
        createdAt: now,
      };

      const saved = this.saveLedger(ledger);
      if (!saved) {
        // Quota exceeded on localStorage — remove the cache entry to stay
        // consistent, then return the already-obtained blob.
        await cache.delete(sourceUrl);
        delete ledger[sourceUrl];
        return URL.createObjectURL(blob);
      }

      // Enforce 250 MB ceiling (async, non-blocking to the caller)
      ledger = await this.enforceMemoryCeiling(ledger);

      return URL.createObjectURL(blob);
    } catch {
      // --- Fail-safe: always fall back to direct/proxy fetch URL --------
      try {
        const fallbackResponse = await fetch(fetchUrl);
        const blob = await fallbackResponse.blob();
        return URL.createObjectURL(blob);
      } catch {
        // Absolute last resort — return the proxy URL so the browser can
        // handle it natively (e.g. <img src>, <video src>).
        return fetchUrl;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Manual cache invalidation (utility, not part of hot path)
  // -----------------------------------------------------------------------

  async clearAll(): Promise<void> {
    try {
      await caches.delete(CACHE_STORE);
    } catch {
      // no-op
    }
    try {
      localStorage.removeItem(LEDGER_KEY);
    } catch {
      // no-op
    }
  }

  async evictUrl(sourceUrl: string): Promise<void> {
    try {
      const cache = await caches.open(CACHE_STORE);
      await cache.delete(sourceUrl);
    } catch {
      // no-op
    }
    try {
      const ledger = this.loadLedger();
      delete ledger[sourceUrl];
      this.saveLedger(ledger);
    } catch {
      // no-op
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------
export const edgeCacheController = new EdgeCacheController();
export default EdgeCacheController;
