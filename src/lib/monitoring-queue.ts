/**
 * In-memory batching queue for monitoring events.
 * Implements circular buffer behavior and deduplication.
 */

export class MonitoringQueue<T> {
  private queue: T[] = [];
  private readonly maxEntries: number;
  private isFlushing = false;
  private seenHashes = new Set<string>();
  private readonly hashFn: (item: T) => string;

  constructor(maxEntries = 500, hashFn: (item: T) => string) {
    this.maxEntries = maxEntries;
    this.hashFn = hashFn;
  }

  /**
   * Add item to queue with circular buffer behavior and deduplication
   */
  push(item: T): void {
    const hash = this.hashFn(item);

    // Simple deduplication within the current batch
    if (this.seenHashes.has(hash)) {
      return;
    }

    this.queue.push(item);
    this.seenHashes.add(hash);

    // Enforce max size (circular buffer behavior: drop oldest)
    if (this.queue.length > this.maxEntries) {
      const removed = this.queue.shift();
      if (removed) {
        const removedHash = this.hashFn(removed);
        // Be careful not to remove hash if another identical item exists (though dedup prevents duplicates)
        // Since we prevent duplicates, we can safely remove the hash IF it was the only one.
        // But since we just deduped, there shouldn't be duplicates in the queue.
        this.seenHashes.delete(removedHash);
      }
    }
  }

  /**
   * Get all items and clear the queue (atomically-ish)
   * Returns empty array if locked (flushing)
   */
  flush(): T[] {
    if (this.isFlushing) {
      return [];
    }

    this.lock();
    const items = [...this.queue];
    this.queue = [];
    this.seenHashes.clear();
    this.unlock();
    return items;
  }

  /**
   * Acquire lock for flushing
   */
  lock(): void {
    this.isFlushing = true;
  }

  /**
   * Release lock after flushing is done
   */
  unlock(): void {
    this.isFlushing = false;
  }

  /**
   * Get current queue depth
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear queue manually
   */
  clear(): void {
    this.queue = [];
    this.seenHashes.clear();
    this.isFlushing = false;
  }
}

/**
 * Simple non-crypto string hash
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) ?? 0;
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
