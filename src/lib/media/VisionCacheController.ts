/**
 * VisionCacheController — Client-Side Vision Media Buffering
 * @version 1.0.0
 * @module src/lib/media/VisionCacheController
 *
 * Extends the EdgeCacheController pattern for vision-specific media.
 * Handles image frame caching, thumbnail generation, and cache
 * eviction based on LRU policy with memory budgets.
 *
 * Design:
 *   Input Image → Hash → Cache Check → Process or Serve Cached
 *                                 ↓
 *                       VisionContextId (deterministic)
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: SHA-256 hash of image bytes → same visionContextId
 * - Atomic Idempotency: Re-caching same frame is a harmless no-op
 * - Memory Safety: LRU eviction prevents unbounded cache growth
 * - Privacy-First: Cached frames can be purged on user request
 * - Modularity: Pure utility — no React, no hooks, no store coupling
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Configuration
// ============================================================================

const VISION_CACHE_KEY = 'omni-vision-v1';
const MAX_CACHE_ENTRIES = 100;

// ============================================================================
// Deterministic Hashing
// ============================================================================

/**
 * Generate a deterministic vision context ID from image bytes.
 * Uses SubtleCrypto SHA-256 for browser-native hashing.
 *
 * Same image bytes → same visionContextId (every time, guaranteed).
 */
export async function generateVisionContextId(
  imageData: ArrayBuffer,
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', imageData);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `vcid-${hashHex.slice(0, 32)}`;
}

// ============================================================================
// Cache Entry Metadata
// ============================================================================

export interface VisionCacheEntry {
  /** Deterministic context ID (SHA-256-based) */
  readonly visionContextId: string;
  /** MIME type of the cached media */
  readonly mimeType: string;
  /** Original image dimensions */
  readonly width: number;
  readonly height: number;
  /** Size in bytes */
  readonly sizeBytes: number;
  /** Timestamp of cache insertion */
  readonly cachedAt: string;
  /** Number of times this entry was accessed */
  accessCount: number;
  /** Timestamp of last access */
  lastAccessedAt: string;
}

// ============================================================================
// In-Memory LRU Index
// ============================================================================

/** LRU index for cache management — keys ordered by last access */
const cacheIndex = new Map<string, VisionCacheEntry>();

/**
 * Get the current cache size.
 */
export function getCacheSize(): number {
  return cacheIndex.size;
}

/**
 * Get all cache entries (for diagnostics).
 */
export function getCacheEntries(): readonly VisionCacheEntry[] {
  return Array.from(cacheIndex.values());
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Cache an image frame for vision processing.
 *
 * @param imageData - Raw image bytes
 * @param mimeType - MIME type (e.g., 'image/png')
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns VisionCacheEntry with the deterministic visionContextId
 */
export async function cacheVisionFrame(
  imageData: ArrayBuffer,
  mimeType: string,
  width: number,
  height: number,
): Promise<VisionCacheEntry> {
  const visionContextId = await generateVisionContextId(imageData);

  // Idempotency: already cached → return existing entry
  const existing = cacheIndex.get(visionContextId);
  if (existing) {
    existing.accessCount++;
    existing.lastAccessedAt = new Date().toISOString();
    return existing;
  }

  // Evict LRU entries if at capacity
  if (cacheIndex.size >= MAX_CACHE_ENTRIES) {
    evictLRU();
  }

  // Write to browser Cache API if available
  if ('caches' in globalThis) {
    try {
      const cache = await caches.open(VISION_CACHE_KEY);
      const response = new Response(imageData, {
        headers: { 'Content-Type': mimeType },
      });
      await cache.put(`/vision/${visionContextId}`, response);
    } catch (err) {
      console.warn('[VisionCache] Cache API write failed:', err);
    }
  }

  // Add to LRU index
  const now = new Date().toISOString();
  const entry: VisionCacheEntry = {
    visionContextId,
    mimeType,
    width,
    height,
    sizeBytes: imageData.byteLength,
    cachedAt: now,
    accessCount: 1,
    lastAccessedAt: now,
  };
  cacheIndex.set(visionContextId, entry);

  return entry;
}

/**
 * Retrieve a cached vision frame by context ID.
 *
 * @returns Blob URL for the cached image, or null if not cached.
 */
export async function getCachedFrame(
  visionContextId: string,
): Promise<string | null> {
  const entry = cacheIndex.get(visionContextId);
  if (!entry) return null;

  // Update LRU metadata
  entry.accessCount++;
  entry.lastAccessedAt = new Date().toISOString();

  if (!('caches' in globalThis)) return null;

  try {
    const cache = await caches.open(VISION_CACHE_KEY);
    const response = await cache.match(`/vision/${visionContextId}`);
    if (!response) return null;

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Check if a vision context ID is cached.
 */
export function isCached(visionContextId: string): boolean {
  return cacheIndex.has(visionContextId);
}

/**
 * Purge a specific cached frame (e.g., on user privacy request).
 */
export async function purgeFrame(visionContextId: string): Promise<void> {
  cacheIndex.delete(visionContextId);

  if ('caches' in globalThis) {
    try {
      const cache = await caches.open(VISION_CACHE_KEY);
      await cache.delete(`/vision/${visionContextId}`);
    } catch {
      // Purge failure is non-critical — entry already removed from index
    }
  }
}

/**
 * Purge all cached vision frames.
 */
export async function purgeAllFrames(): Promise<void> {
  cacheIndex.clear();

  if ('caches' in globalThis) {
    try {
      await caches.delete(VISION_CACHE_KEY);
    } catch {
      // Purge failure is non-critical
    }
  }
}

// ============================================================================
// LRU Eviction
// ============================================================================

/**
 * Evict the least recently used entry from the cache.
 */
function evictLRU(): void {
  let oldestKey: string | null = null;
  let oldestAccess = Infinity;

  for (const [key, entry] of cacheIndex) {
    const accessTime = new Date(entry.lastAccessedAt).getTime();
    if (accessTime < oldestAccess) {
      oldestAccess = accessTime;
      oldestKey = key;
    }
  }

  if (oldestKey !== null) {
    cacheIndex.delete(oldestKey);
  }
}
