/**
 * Batch processing utility for optimizing multiple operations
 */

interface BatchItem<T, R> {
  id: string;
  data: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

export class BatchProcessor<T, R> {
  private queue: BatchItem<T, R>[] = [];
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private batchHandler: (items: T[]) => Promise<R[]>,
    private options: {
      maxBatchSize?: number;
      maxWaitMs?: number;
    } = {}
  ) {
    this.options.maxBatchSize = options.maxBatchSize || 10;
    this.options.maxWaitMs = options.maxWaitMs || 50;
  }

  /**
   * Add item to batch queue
   */
  add(data: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({
        id: crypto.randomUUID(),
        data,
        resolve,
        reject,
      });

      // Process immediately if batch is full
      if (this.queue.length >= this.options.maxBatchSize!) {
        this.flush();
      } else if (!this.timer) {
        // Schedule batch processing
        this.timer = setTimeout(() => this.flush(), this.options.maxWaitMs);
      }
    });
  }

  /**
   * Process current batch immediately
   */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.options.maxBatchSize);

    try {
      const items = batch.map(item => item.data);
      const results = await this.batchHandler(items);

      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.reject(error instanceof Error ? error : new Error('Batch processing failed'));
      });
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        this.flush();
      }
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}
