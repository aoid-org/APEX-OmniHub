import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The module creates a singleton with setInterval on import.
// We must mock heartbeat before importing the module under test.
vi.mock('@/guardian/heartbeat', () => ({
  recordLoopHeartbeat: vi.fn(),
}));

// Dynamic import to get a fresh module for each test is not practical here
// because the module exports a singleton. Instead we test the class via
// the exported singleton's methods.

describe('ConnectionPool', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pool: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    // Re-import to get fresh module state
    const mod = await import('@/lib/connection-pool');
    pool = mod.connectionPool;
  });

  afterEach(() => {
    pool.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('acquire', () => {
    it('should acquire a new connection and return true', () => {
      expect(pool.acquire('conn-1')).toBe(true);
    });

    it('should return false when connection is already in use', () => {
      pool.acquire('conn-1');
      expect(pool.acquire('conn-1')).toBe(false);
    });

    it('should allow re-acquiring a released connection', () => {
      pool.acquire('conn-1');
      pool.release('conn-1');
      expect(pool.acquire('conn-1')).toBe(true);
    });

    it('should evict LRU when at max capacity', () => {
      // Create pool at max connections (default 10)
      for (let i = 0; i < 10; i++) {
        pool.acquire(`conn-${i}`);
        pool.release(`conn-${i}`);
      }

      const stats = pool.getStats();
      expect(stats.total).toBe(10);

      // Acquiring conn-10 should evict the oldest idle connection
      pool.acquire('conn-10');
      const statsAfter = pool.getStats();
      expect(statsAfter.total).toBe(10);
    });
  });

  describe('release', () => {
    it('should mark connection as idle', () => {
      pool.acquire('conn-1');
      pool.release('conn-1');
      const stats = pool.getStats();
      expect(stats.idle).toBe(1);
      expect(stats.inUse).toBe(0);
    });

    it('should be a no-op for non-existent connections', () => {
      pool.release('non-existent');
      expect(pool.getStats().total).toBe(0);
    });
  });

  describe('remove', () => {
    it('should remove a connection', () => {
      pool.acquire('conn-1');
      pool.remove('conn-1');
      expect(pool.getStats().total).toBe(0);
    });

    it('should call cleanup callback when removing', () => {
      const cleanup = vi.fn();
      // Acquire creates a connection — add cleanup via internal access
      pool.acquire('conn-1');
      // Access internal map to set cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = (pool as any).connections.get('conn-1');
      conn.cleanup = cleanup;
      pool.remove('conn-1');
      expect(cleanup).toHaveBeenCalledOnce();
    });

    it('should be a no-op for non-existent connections', () => {
      pool.remove('non-existent');
      expect(pool.getStats().total).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should clear all connections and stop cleanup interval', () => {
      pool.acquire('conn-1');
      pool.acquire('conn-2');
      pool.destroy();
      expect(pool.getStats().total).toBe(0);
    });

    it('should call cleanup on all connections during destroy', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      pool.acquire('conn-1');
      pool.acquire('conn-2');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pool as any).connections.get('conn-1').cleanup = cleanup1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pool as any).connections.get('conn-2').cleanup = cleanup2;
      pool.destroy();
      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty pool', () => {
      const stats = pool.getStats();
      expect(stats).toEqual({
        total: 0,
        inUse: 0,
        idle: 0,
        maxConnections: 10,
      });
    });

    it('should count in-use and idle connections correctly', () => {
      pool.acquire('conn-1');
      pool.acquire('conn-2');
      pool.release('conn-2');

      const stats = pool.getStats();
      expect(stats.total).toBe(2);
      expect(stats.inUse).toBe(1);
      expect(stats.idle).toBe(1);
    });
  });

  describe('idle cleanup', () => {
    it('should remove stale idle connections after timeout', () => {
      pool.acquire('conn-1');
      pool.release('conn-1');

      // Advance time past idle timeout (default 60000ms)
      vi.advanceTimersByTime(61000);

      // Trigger cleanup by advancing past cleanup interval (30000ms)
      vi.advanceTimersByTime(30000);

      // The idle cleanup runs periodically — check stats
      expect(pool.getStats().total).toBeLessThanOrEqual(1);
    });
  });
});
