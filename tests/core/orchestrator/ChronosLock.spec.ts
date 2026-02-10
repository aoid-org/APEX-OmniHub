/**
 * Tests for ChronosLock — idempotency state machine.
 * @date 2026-02-09
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  _resetForTesting,
  acquire,
  commit,
  lookup,
  rollback,
} from '../../../src/core/orchestrator/ChronosLock';
import { IdempotencyState } from '../../../src/core/types/index';

describe('ChronosLock', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe('acquire', () => {
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

  describe('commit', () => {
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

  describe('rollback', () => {
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
});
