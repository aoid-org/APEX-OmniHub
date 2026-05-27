/**
 * Tests for ChronosLock — idempotency state machine.
 * @date 2026-02-09 (v1 sync) / 2026-05-27 (v2 async durable)
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  _resetForTesting,
  acquire,
  acquireAsync,
  commit,
  commitAsync,
  lookup,
  lookupAsync,
  rollback,
  rollbackAsync,
} from '../../../src/core/orchestrator/ChronosLock';
import { IdempotencyState } from '../../../src/core/types/index';

describe('ChronosLock', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe('acquire (sync — backward compat)', () => {
    it('returns isNew=true for fresh key', () => {
      const result = acquire('key-1');
      expect(result.isNew).toBe(true);
      expect(result.record.state).toBe(IdempotencyState.PENDING);
    });

    it('returns isNew=false for duplicate key', () => {
      acquire('key-1');
      const second = acquire('key-1');
      expect(second.isNew).toBe(false);
    });
  });

  describe('commit (sync — backward compat)', () => {
    it('transitions PENDING to COMPLETED', () => {
      acquire('key-1');
      const ok = commit('key-1', { data: 'result' });
      expect(ok).toBe(true);

      const record = lookup('key-1');
      expect(record?.state).toBe(IdempotencyState.COMPLETED);
      expect(record?.result).toEqual({ data: 'result' });
    });

    it('rejects commit on unknown key', () => {
      expect(commit('nonexistent')).toBe(false);
    });

    it('rejects commit on already completed key', () => {
      acquire('key-1');
      commit('key-1');
      expect(commit('key-1')).toBe(false);
    });
  });

  describe('rollback (sync — backward compat)', () => {
    it('removes PENDING key', () => {
      acquire('key-1');
      const ok = rollback('key-1');
      expect(ok).toBe(true);
      expect(lookup('key-1')).toBeUndefined();
    });

    it('does not remove COMPLETED key', () => {
      acquire('key-1');
      commit('key-1');
      expect(rollback('key-1')).toBe(false);
    });

    it('returns false for unknown key', () => {
      expect(rollback('nonexistent')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Async API — durable store (InMemoryIdempotencyStore adapter)
  // ---------------------------------------------------------------------------

  describe('acquireAsync', () => {
    it('returns isNew=true for a fresh key', async () => {
      const { isNew, record } = await acquireAsync('async-key-1');
      expect(isNew).toBe(true);
      expect(record?.state).toBe(IdempotencyState.PENDING);
    });

    it('returns isNew=false for a duplicate key (concurrent-duplicate prevention)', async () => {
      await acquireAsync('async-key-1');
      const { isNew } = await acquireAsync('async-key-1');
      expect(isNew).toBe(false);
    });

    it('concurrent duplicate: only one insertion wins', async () => {
      // Simulate two concurrent callers racing on the same key
      const [r1, r2] = await Promise.all([
        acquireAsync('race-key'),
        acquireAsync('race-key'),
      ]);
      const newCount = [r1, r2].filter((r) => r.isNew).length;
      expect(newCount).toBe(1); // exactly one winner
    });
  });

  describe('commitAsync', () => {
    it('transitions PENDING to COMPLETED and stores result', async () => {
      await acquireAsync('async-key-2');
      const ok = await commitAsync('async-key-2', { value: 42 });
      expect(ok).toBe(true);

      const record = await lookupAsync('async-key-2');
      expect(record?.state).toBe(IdempotencyState.COMPLETED);
      expect(record?.result).toEqual({ value: 42 });
    });

    it('rejects commit on nonexistent key', async () => {
      expect(await commitAsync('ghost-key', {})).toBe(false);
    });

    it('rejects double-commit — safe replay returns cached first result', async () => {
      await acquireAsync('async-key-3');
      await commitAsync('async-key-3', { done: true });
      const second = await commitAsync('async-key-3', { done: false });
      expect(second).toBe(false);

      // Cached result is the FIRST commit's result
      const record = await lookupAsync('async-key-3');
      expect(record?.result).toEqual({ done: true });
    });
  });

  describe('rollbackAsync', () => {
    it('removes a PENDING key', async () => {
      await acquireAsync('async-key-4');
      const ok = await rollbackAsync('async-key-4');
      expect(ok).toBe(true);
      expect(await lookupAsync('async-key-4')).toBeNull();
    });

    it('does not remove a COMPLETED key', async () => {
      await acquireAsync('async-key-5');
      await commitAsync('async-key-5', {});
      expect(await rollbackAsync('async-key-5')).toBe(false);
    });

    it('returns false for unknown key', async () => {
      expect(await rollbackAsync('ghost-key')).toBe(false);
    });
  });

  describe('lookupAsync', () => {
    it('returns null for unknown key', async () => {
      expect(await lookupAsync('missing')).toBeNull();
    });

    it('returns PENDING record before commit', async () => {
      await acquireAsync('lookup-key');
      const record = await lookupAsync('lookup-key');
      expect(record?.state).toBe(IdempotencyState.PENDING);
    });
  });
});
