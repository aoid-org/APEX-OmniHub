import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueue, replay, registerExecutor } from '@/lib/offline';

describe('offline queue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('queue persists across simulated reload', () => {
    enqueue({ kind: 'test_op', payload: { msg: 'hello' } });
    const queue = JSON.parse(localStorage.getItem('offline_queue')!);
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe('test_op');
    expect(queue[0].payload).toEqual({ msg: 'hello' });
    expect(queue[0].attempt).toBe(0);
    expect(queue[0].id).toBeDefined();
    expect(queue[0].createdAt).toBeGreaterThan(0);
  });

  it('corrupted queue quarantines without crash', async () => {
    localStorage.setItem('offline_queue', '{invalid json!!!');
    await expect(replay()).resolves.not.toThrow();
    expect(localStorage.getItem('offline_queue_corrupted')).toBeTruthy();
  });

  it('replay executes registered handlers', async () => {
    const executor = vi.fn().mockResolvedValueOnce(undefined);
    registerExecutor('test_replay', executor);
    enqueue({ kind: 'test_replay', payload: { x: 1 } });
    await replay();
    expect(executor).toHaveBeenCalledWith({ x: 1 });
    // Queue should be empty after successful replay
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    expect(queue).toHaveLength(0);
  });

  it('caps queue at MAX_QUEUE_SIZE by dropping oldest', () => {
    for (let i = 0; i < 55; i++) {
      enqueue({ kind: 'bulk', payload: { i } });
    }
    const queue = JSON.parse(localStorage.getItem('offline_queue')!);
    expect(queue.length).toBeLessThanOrEqual(50);
  });
});
