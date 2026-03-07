import { describe, it, expect, beforeEach } from 'vitest';
import { MonitoringQueue, simpleHash } from '../../src/lib/monitoring-queue';

describe('MonitoringQueue', () => {
  let queue: MonitoringQueue<string>;
  const hashFn = (item: string) => simpleHash(item);

  beforeEach(() => {
    queue = new MonitoringQueue(3, hashFn); // Small max size for testing
  });

  it('should push items and retrieve them on flush', () => {
    queue.push('a');
    queue.push('b');
    expect(queue.size).toBe(2);

    const flushed = queue.flush();
    expect(flushed).toEqual(['a', 'b']);
    expect(queue.size).toBe(0);
  });

  it('should enforce max entries (circular buffer)', () => {
    queue.push('a');
    queue.push('b');
    queue.push('c');
    expect(queue.size).toBe(3);

    // Push one more, 'a' should be dropped
    queue.push('d');
    expect(queue.size).toBe(3);

    const flushed = queue.flush();
    expect(flushed).toEqual(['b', 'c', 'd']);
  });

  it('should deduplicate items', () => {
    queue.push('a');
    queue.push('a'); // Duplicate

    expect(queue.size).toBe(1);
    const flushed = queue.flush();
    expect(flushed).toEqual(['a']);
  });

  it('should manage locks', () => {
    queue.push('a');
    queue.lock();

    // Should return empty if locked
    expect(queue.flush()).toEqual([]);

    // Queue should still hold the items
    expect(queue.size).toBe(1);

    queue.unlock();
    expect(queue.flush()).toEqual(['a']);
  });

  it('should clear queue', () => {
    queue.push('a');
    queue.clear();
    expect(queue.size).toBe(0);
    expect(queue.flush()).toEqual([]);
  });

  it('should handle circular buffer with deduplication correctly', () => {
    // Fill queue
    queue.push('a');
    queue.push('b');
    queue.push('c');

    // 'a' is dropped, 'd' is added
    queue.push('d');

    // 'a' should be gone from seenHashes too, so if we add 'a' again, it should be accepted
    queue.push('a');

    // Expected: c, d, a (since max is 3: b dropped)
    const flushed = queue.flush();
    expect(flushed).toEqual(['c', 'd', 'a']);
  });
});
