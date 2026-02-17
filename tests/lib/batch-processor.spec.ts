import { describe, it, expect, vi, afterEach } from 'vitest';
import { BatchProcessor } from '@/lib/batch-processor';

describe('BatchProcessor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process items in batches', async () => {
    const handler = vi.fn().mockImplementation(async (items: any[]) => {
      return items.map(item => item * 2);
    });

    const processor = new BatchProcessor<number, number>(handler, {
      maxBatchSize: 5,
      maxWaitMs: 50,
    });

    const resultsPromise = Promise.all([
      processor.add(1),
      processor.add(2),
      processor.add(3),
    ]);

    expect(handler).not.toHaveBeenCalled();
    expect(processor.getQueueSize()).toBe(3);

    // Wait for the timer to trigger
    await new Promise(resolve => setTimeout(resolve, 100));

    const results = await resultsPromise;
    expect(results).toEqual([2, 4, 6]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith([1, 2, 3]);
    expect(processor.getQueueSize()).toBe(0);
  });

  it('should process immediately when maxBatchSize is reached', async () => {
    const handler = vi.fn().mockImplementation(async (items: any[]) => {
      return items.map(item => item * 2);
    });

    const processor = new BatchProcessor<number, number>(handler, {
      maxBatchSize: 3,
      maxWaitMs: 100,
    });

    const p1 = processor.add(1);
    const p2 = processor.add(2);
    expect(handler).not.toHaveBeenCalled();

    const p3 = processor.add(3); // This should trigger flush

    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual([2, 4, 6]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('should handle errors in batch handler', async () => {
    const error = new Error('Batch failed');
    const handler = vi.fn().mockRejectedValue(error);

    const processor = new BatchProcessor<number, number>(handler, {
      maxBatchSize: 2,
    });

    const p1 = processor.add(1);
    const p2 = processor.add(2);

    try {
        await Promise.all([p1, p2]);
    } catch (e) {
        // expected
    }

    await expect(p1).rejects.toThrow('Batch failed');
    await expect(p2).rejects.toThrow('Batch failed');
  });

  it('should process remaining items in multiple batches if overflowed', async () => {
    const handler = vi.fn().mockImplementation(async (items: any[]) => {
      return items.map(item => item * 2);
    });

    const processor = new BatchProcessor<number, number>(handler, {
      maxBatchSize: 2,
    });

    const resultsPromise = Promise.all([
      processor.add(1),
      processor.add(2),
      processor.add(3),
      processor.add(4),
      processor.add(5),
    ]);

    const results = await resultsPromise;
    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenNthCalledWith(1, [1, 2]);
    expect(handler).toHaveBeenNthCalledWith(2, [3, 4]);
    expect(handler).toHaveBeenNthCalledWith(3, [5]);
  });

  it('should return correct queue size', () => {
    const processor = new BatchProcessor<number, number>(async (items) => items);
    expect(processor.getQueueSize()).toBe(0);
    processor.add(1);
    processor.add(2);
    expect(processor.getQueueSize()).toBe(2);
  });

  it('should allow manual flush', async () => {
    const handler = vi.fn().mockImplementation(async (items: any[]) => {
      return items.map(item => item * 2);
    });

    const processor = new BatchProcessor<number, number>(handler, {
      maxWaitMs: 1000,
    });

    const p1 = processor.add(1);
    expect(handler).not.toHaveBeenCalled();

    await processor.flush();
    const result = await p1;

    expect(result).toBe(2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not process if already processing', async () => {
    let resolveHandler: (value: any[]) => void = () => {};
    const handler = vi.fn().mockImplementation(() => {
      return new Promise<number[]>((resolve) => {
        resolveHandler = resolve;
      });
    });

    const processor = new BatchProcessor<number, number>(handler, {
      maxBatchSize: 2
    });

    const p1 = processor.add(1);
    const p2 = processor.add(2); // Triggers flush

    expect(handler).toHaveBeenCalledTimes(1);

    // Try to flush again while still processing
    const flushPromise = processor.flush();
    expect(handler).toHaveBeenCalledTimes(1); // Should not call again

    resolveHandler([2, 4]);
    await Promise.all([p1, p2, flushPromise]);
  });
});
