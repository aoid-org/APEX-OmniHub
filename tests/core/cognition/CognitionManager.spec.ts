/**
 * CognitionManager Unit Tests
 * @module tests/core/cognition/CognitionManager
 *
 * Validates the 3-tier cognitive state lifecycle:
 *  Tier 1 (Short-Term) → Tier 2 (Medium-Term via compression) → Tier 3 (Long-Term brain)
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CognitionManager,
  COGNITION_FILE_KEYS,
  CognitiveStateSchema,
} from '../../../src/core/cognition/CognitionManager';

describe('CognitionManager', () => {
  let manager: CognitionManager;

  beforeEach(() => {
    CognitionManager.resetInstance();
    manager = CognitionManager.getInstance();
  });

  afterEach(() => {
    CognitionManager.resetInstance();
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      const a = CognitionManager.getInstance();
      const b = CognitionManager.getInstance();
      expect(a).toBe(b);
    });

    it('returns a new instance after resetInstance', () => {
      const a = CognitionManager.getInstance();
      CognitionManager.resetInstance();
      const b = CognitionManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  // --------------------------------------------------------------------------
  // Constants
  // --------------------------------------------------------------------------

  describe('COGNITION_FILE_KEYS', () => {
    it('contains all expected cognitive file keys', () => {
      expect(COGNITION_FILE_KEYS).toEqual([
        'brain',
        'session',
        'schemas',
        'ux-training',
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // Load / Save
  // --------------------------------------------------------------------------

  describe('load', () => {
    it('loads valid state and exposes it via getState()', () => {
      const validState = {
        version: '1.0.0',
        brain: [],
        session: [],
        entityIndex: {},
        lastCompression: null,
        tokenEstimate: 0,
      };
      const loaded = manager.load(validState);
      expect(loaded.version).toBe('1.0.0');
      expect(loaded.brain).toEqual([]);
      expect(loaded.session).toEqual([]);
    });

    it('rejects invalid state and falls back to defaults', () => {
      const invalid = { version: 123, brain: 'not-an-array' };
      const loaded = manager.load(invalid);
      expect(loaded.version).toBe('1.0.0');
      expect(loaded.brain).toEqual([]);
      expect(loaded.session).toEqual([]);
    });

    it('handles null input gracefully', () => {
      const loaded = manager.load(null);
      expect(loaded.version).toBe('1.0.0');
    });

    it('handles undefined input gracefully', () => {
      const loaded = manager.load(undefined);
      expect(loaded.version).toBe('1.0.0');
    });
  });

  describe('getState', () => {
    it('returns a deep clone — mutations do not affect internal state', () => {
      manager.recordAction('test action');
      const state1 = manager.getState();
      const state2 = manager.getState();
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
      expect(state1.session).not.toBe(state2.session);
    });
  });

  // --------------------------------------------------------------------------
  // Session Management (Tier 1)
  // --------------------------------------------------------------------------

  describe('recordAction', () => {
    it('adds a session entry with correct fields', () => {
      const entry = manager.recordAction('deployed service', 'exit 0');
      expect(entry.action).toBe('deployed service');
      expect(entry.result).toBe('exit 0');
      expect(entry.compressed).toBe(false);
      expect(entry.id).toMatch(/^se-/);
      expect(entry.timestamp).toBeTruthy();
    });

    it('increases token estimate after recording', () => {
      const before = manager.getTokenEstimate();
      manager.recordAction('a long descriptive action for token counting');
      const after = manager.getTokenEstimate();
      expect(after).toBeGreaterThan(before);
    });

    it('records multiple entries chronologically', () => {
      manager.recordAction('first');
      manager.recordAction('second');
      manager.recordAction('third');
      const recent = manager.getRecentActions(3);
      expect(recent).toHaveLength(3);
      expect(recent[0].action).toBe('first');
      expect(recent[2].action).toBe('third');
    });
  });

  describe('getRecentActions', () => {
    it('returns at most N entries', () => {
      for (let i = 0; i < 30; i++) {
        manager.recordAction(`action-${i}`);
      }
      const recent = manager.getRecentActions(5);
      expect(recent).toHaveLength(5);
      expect(recent[4].action).toBe('action-29');
    });

    it('returns all entries when fewer than N exist', () => {
      manager.recordAction('only-one');
      const recent = manager.getRecentActions(20);
      expect(recent).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // Brain Management (Tier 3)
  // --------------------------------------------------------------------------

  describe('promoteToBrain', () => {
    it('adds a fact to long-term memory', () => {
      const fact = manager.promoteToBrain('APEX uses Zod', 'architecture-doc');
      expect(fact.content).toBe('APEX uses Zod');
      expect(fact.source).toBe('architecture-doc');
      expect(fact.tier).toBe('long-term');
      expect(fact.promoted).toBe(true);
      expect(fact.referenceCount).toBe(1);
    });

    it('deduplicates by content+source and increments referenceCount', () => {
      manager.promoteToBrain('APEX uses Zod', 'docs');
      const second = manager.promoteToBrain('APEX uses Zod', 'docs');
      expect(second.referenceCount).toBe(2);
      expect(manager.getBrainFacts()).toHaveLength(1);
    });

    it('allows same content from different sources', () => {
      manager.promoteToBrain('APEX uses Zod', 'source-a');
      manager.promoteToBrain('APEX uses Zod', 'source-b');
      expect(manager.getBrainFacts()).toHaveLength(2);
    });
  });

  describe('getBrainFacts', () => {
    it('returns empty array initially', () => {
      expect(manager.getBrainFacts()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Entity Index
  // --------------------------------------------------------------------------

  describe('indexEntity / lookupEntity', () => {
    it('registers and retrieves entity-fact associations', () => {
      manager.indexEntity('CognitionManager', 'fact-1');
      manager.indexEntity('CognitionManager', 'fact-2');
      const ids = manager.lookupEntity('CognitionManager');
      expect(ids).toEqual(['fact-1', 'fact-2']);
    });

    it('deduplicates same factId for the same entity', () => {
      manager.indexEntity('OmniRoute', 'fact-1');
      manager.indexEntity('OmniRoute', 'fact-1');
      expect(manager.lookupEntity('OmniRoute')).toHaveLength(1);
    });

    it('returns empty array for unknown entity', () => {
      expect(manager.lookupEntity('UnknownEntity')).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Compression (Tier 2)
  // --------------------------------------------------------------------------

  describe('compress', () => {
    it('returns 0 when session has ≤ 20 entries', () => {
      for (let i = 0; i < 15; i++) {
        manager.recordAction(`action-${i}`);
      }
      const count = manager.compress();
      expect(count).toBe(0);
    });

    it('compresses middle entries when session exceeds threshold', () => {
      for (let i = 0; i < 30; i++) {
        manager.recordAction(`action-${i}`, `result-${i}`);
      }
      const count = manager.compress();
      expect(count).toBeGreaterThan(0);
    });

    it('promotes compressed summaries to brain', () => {
      for (let i = 0; i < 30; i++) {
        manager.recordAction(`action-${i}`, `result-${i}`);
      }
      manager.compress();
      const brainFacts = manager.getBrainFacts();
      expect(brainFacts.length).toBeGreaterThan(0);
      expect(brainFacts[0].content).toContain('[Compressed');
    });

    it('updates lastCompression timestamp', () => {
      for (let i = 0; i < 30; i++) {
        manager.recordAction(`action-${i}`);
      }
      manager.compress();
      const state = manager.getState();
      expect(state.lastCompression).not.toBeNull();
    });
  });

  describe('auto-compression at threshold', () => {
    it('triggers compression when session exceeds 50 entries', () => {
      for (let i = 0; i < 55; i++) {
        manager.recordAction(`auto-action-${i}`);
      }
      // After 51 entries, auto-compression should have triggered
      const state = manager.getState();
      expect(state.lastCompression).not.toBeNull();
      expect(state.brain.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Token Estimation
  // --------------------------------------------------------------------------

  describe('getTokenEstimate', () => {
    it('returns 0 on fresh instance', () => {
      expect(manager.getTokenEstimate()).toBe(0);
    });

    it('increases after recording actions', () => {
      manager.recordAction('some action text');
      expect(manager.getTokenEstimate()).toBeGreaterThan(0);
    });
  });

  describe('getActiveSessionCount', () => {
    it('returns 0 on fresh instance', () => {
      expect(manager.getActiveSessionCount()).toBe(0);
    });

    it('counts only uncompressed entries', () => {
      for (let i = 0; i < 30; i++) {
        manager.recordAction(`action-${i}`);
      }
      const beforeCompress = manager.getActiveSessionCount();
      expect(beforeCompress).toBe(30);
      manager.compress();
      const afterCompress = manager.getActiveSessionCount();
      expect(afterCompress).toBeLessThan(beforeCompress);
    });
  });

  // --------------------------------------------------------------------------
  // Schema Validation
  // --------------------------------------------------------------------------

  describe('CognitiveStateSchema', () => {
    it('validates a minimal empty state', () => {
      const result = CognitiveStateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects non-object input', () => {
      const result = CognitiveStateSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });
});
