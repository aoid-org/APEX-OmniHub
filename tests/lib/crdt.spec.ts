import { describe, it, expect } from 'vitest';
import { LWWRegister } from '@/lib/crdt/LWWRegister';
import { CRDTMap } from '@/lib/crdt/CRDTMap';
import {
  mergeSpatialStates,
  serializeCRDTState,
  deserializeCRDTState,
  createEmptySpatialState,
} from '@/lib/crdt/mergeFn';
import type { SpatialCRDTState } from '@/lib/crdt/mergeFn';

// ============================================================================
// LWWRegister Tests
// ============================================================================

describe('LWWRegister', () => {
  it('should store value, timestamp, and peerId', () => {
    const reg = new LWWRegister('hello', 100, 'peer-A');
    expect(reg.get()).toBe('hello');
    expect(reg.timestamp).toBe(100);
    expect(reg.peerId).toBe('peer-A');
  });

  describe('set', () => {
    it('should accept a write with a newer timestamp', () => {
      const reg = new LWWRegister('old', 100, 'A');
      const updated = reg.set('new', 200, 'A');
      expect(updated.get()).toBe('new');
      expect(updated.timestamp).toBe(200);
    });

    it('should reject a write with an older timestamp', () => {
      const reg = new LWWRegister('current', 200, 'A');
      const result = reg.set('rejected', 100, 'A');
      expect(result.get()).toBe('current');
    });

    it('should use peerId as tiebreaker on same timestamp', () => {
      const reg = new LWWRegister('value-A', 100, 'A');
      const result = reg.set('value-B', 100, 'B');
      expect(result.get()).toBe('value-B'); // B > A lexicographically
    });

    it('should reject write with same timestamp and lower peerId', () => {
      const reg = new LWWRegister('value-Z', 100, 'Z');
      const result = reg.set('value-A', 100, 'A');
      expect(result.get()).toBe('value-Z');
    });

    it('should not mutate the original register', () => {
      const reg = new LWWRegister('original', 100, 'A');
      reg.set('new', 200, 'A');
      expect(reg.get()).toBe('original');
    });
  });

  describe('merge', () => {
    it('should pick the register with a higher timestamp', () => {
      const a = new LWWRegister('a-val', 100, 'A');
      const b = new LWWRegister('b-val', 200, 'B');
      const merged = a.merge(b);
      expect(merged.get()).toBe('b-val');
    });

    it('should be commutative', () => {
      const a = new LWWRegister('a', 100, 'A');
      const b = new LWWRegister('b', 200, 'B');
      expect(a.merge(b).get()).toBe(b.merge(a).get());
    });

    it('should use peerId tiebreaker on equal timestamps', () => {
      const a = new LWWRegister('a', 100, 'A');
      const b = new LWWRegister('b', 100, 'B');
      expect(a.merge(b).get()).toBe('b');
      expect(b.merge(a).get()).toBe('b');
    });

    it('should be idempotent', () => {
      const reg = new LWWRegister('val', 100, 'A');
      const merged = reg.merge(reg);
      expect(merged.get()).toBe('val');
    });
  });

  describe('serialization', () => {
    it('should round-trip via toJSON/fromJSON', () => {
      const reg = new LWWRegister('data', 42, 'peer-1');
      const json = reg.toJSON();
      const restored = LWWRegister.fromJSON(json);
      expect(restored.get()).toBe('data');
      expect(restored.timestamp).toBe(42);
      expect(restored.peerId).toBe('peer-1');
    });
  });
});

// ============================================================================
// CRDTMap Tests
// ============================================================================

describe('CRDTMap', () => {
  it('should set and get a value', () => {
    const map = new CRDTMap<string, string>();
    const updated = map.set('key1', 'value1', 100, 'A');
    expect(updated.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent key', () => {
    const map = new CRDTMap<string, string>();
    expect(map.get('nope')).toBeUndefined();
  });

  it('should track size correctly', () => {
    let map = new CRDTMap<string, number>();
    map = map.set('a', 1, 100, 'A');
    map = map.set('b', 2, 101, 'A');
    expect(map.size).toBe(2);
  });

  it('should support has()', () => {
    let map = new CRDTMap<string, string>();
    map = map.set('exists', 'val', 100, 'A');
    expect(map.has('exists')).toBe(true);
    expect(map.has('missing')).toBe(false);
  });

  it('should support entries()', () => {
    let map = new CRDTMap<string, number>();
    map = map.set('x', 10, 100, 'A');
    map = map.set('y', 20, 101, 'A');
    const entries = map.entries();
    expect(entries).toContainEqual(['x', 10]);
    expect(entries).toContainEqual(['y', 20]);
  });

  describe('delete', () => {
    it('should tombstone an existing key', () => {
      let map = new CRDTMap<string, string>();
      map = map.set('key', 'val', 100, 'A');
      map = map.delete('key', 200, 'A');
      expect(map.get('key')).toBeUndefined();
      expect(map.has('key')).toBe(false);
      expect(map.size).toBe(0);
    });

    it('should not delete if tombstone timestamp is older than register', () => {
      let map = new CRDTMap<string, string>();
      map = map.set('key', 'val', 200, 'A');
      map = map.delete('key', 100, 'A');
      expect(map.get('key')).toBe('val');
    });

    it('should be a no-op for non-existent key', () => {
      const map = new CRDTMap<string, string>();
      const result = map.delete('missing', 100, 'A');
      expect(result.size).toBe(0);
    });
  });

  describe('set after delete (resurrection)', () => {
    it('should resurrect if set timestamp is newer than tombstone', () => {
      let map = new CRDTMap<string, string>();
      map = map.set('key', 'original', 100, 'A');
      map = map.delete('key', 200, 'A');
      map = map.set('key', 'resurrected', 300, 'A');
      expect(map.get('key')).toBe('resurrected');
    });

    it('should not resurrect if set timestamp is older than tombstone', () => {
      let map = new CRDTMap<string, string>();
      map = map.set('key', 'original', 100, 'A');
      map = map.delete('key', 300, 'A');
      map = map.set('key', 'too-old', 200, 'A');
      expect(map.get('key')).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should merge two maps with disjoint keys', () => {
      let mapA = new CRDTMap<string, number>();
      mapA = mapA.set('a', 1, 100, 'A');
      let mapB = new CRDTMap<string, number>();
      mapB = mapB.set('b', 2, 100, 'B');
      const merged = mapA.merge(mapB);
      expect(merged.get('a')).toBe(1);
      expect(merged.get('b')).toBe(2);
    });

    it('should resolve conflicts using LWW on shared keys', () => {
      let mapA = new CRDTMap<string, string>();
      mapA = mapA.set('key', 'old', 100, 'A');
      let mapB = new CRDTMap<string, string>();
      mapB = mapB.set('key', 'new', 200, 'B');
      const merged = mapA.merge(mapB);
      expect(merged.get('key')).toBe('new');
    });

    it('merge should be commutative', () => {
      let mapA = new CRDTMap<string, string>();
      mapA = mapA.set('key', 'val-A', 100, 'A');
      let mapB = new CRDTMap<string, string>();
      mapB = mapB.set('key', 'val-B', 200, 'B');
      const ab = mapA.merge(mapB);
      const ba = mapB.merge(mapA);
      expect(ab.get('key')).toBe(ba.get('key'));
    });
  });

  describe('serialization', () => {
    it('should round-trip via toJSON/fromJSON', () => {
      let map = new CRDTMap<string, string>();
      map = map.set('alpha', 'one', 100, 'A');
      map = map.set('beta', 'two', 200, 'B');
      const json = map.toJSON();
      const restored = CRDTMap.fromJSON<string, string>(json);
      expect(restored.get('alpha')).toBe('one');
      expect(restored.get('beta')).toBe('two');
      expect(restored.size).toBe(2);
    });
  });
});

// ============================================================================
// mergeFn (Spatial CRDT) Tests
// ============================================================================

describe('mergeSpatialStates', () => {
  it('should merge disjoint entities', () => {
    const local: SpatialCRDTState = {
      positions: { e1: { x: 0, y: 0, timestamp: 100, peerId: 'A' } },
      version: 1,
    };
    const remote: SpatialCRDTState = {
      positions: { e2: { x: 10, y: 10, timestamp: 100, peerId: 'B' } },
      version: 1,
    };
    const merged = mergeSpatialStates(local, remote);
    expect(merged.positions.e1.x).toBe(0);
    expect(merged.positions.e2.x).toBe(10);
  });

  it('should resolve conflict by higher timestamp', () => {
    const local: SpatialCRDTState = {
      positions: { e1: { x: 0, y: 0, timestamp: 100, peerId: 'A' } },
      version: 1,
    };
    const remote: SpatialCRDTState = {
      positions: { e1: { x: 5, y: 5, timestamp: 200, peerId: 'B' } },
      version: 1,
    };
    const merged = mergeSpatialStates(local, remote);
    expect(merged.positions.e1.x).toBe(5);
  });

  it('should use peerId as tiebreaker on equal timestamps', () => {
    const local: SpatialCRDTState = {
      positions: { e1: { x: 1, y: 1, timestamp: 100, peerId: 'A' } },
      version: 1,
    };
    const remote: SpatialCRDTState = {
      positions: { e1: { x: 2, y: 2, timestamp: 100, peerId: 'B' } },
      version: 1,
    };
    const merged = mergeSpatialStates(local, remote);
    expect(merged.positions.e1.peerId).toBe('B'); // B > A
  });

  it('should be commutative', () => {
    const a: SpatialCRDTState = {
      positions: { e1: { x: 1, y: 1, timestamp: 100, peerId: 'A' } },
      version: 1,
    };
    const b: SpatialCRDTState = {
      positions: { e1: { x: 2, y: 2, timestamp: 200, peerId: 'B' } },
      version: 1,
    };
    expect(mergeSpatialStates(a, b).positions.e1.x)
      .toBe(mergeSpatialStates(b, a).positions.e1.x);
  });

  it('should handle empty states', () => {
    const empty = createEmptySpatialState();
    const state: SpatialCRDTState = {
      positions: { e1: { x: 1, y: 1, timestamp: 100, peerId: 'A' } },
      version: 1,
    };
    const merged = mergeSpatialStates(empty, state);
    expect(merged.positions.e1.x).toBe(1);
  });
});

describe('serializeCRDTState / deserializeCRDTState', () => {
  it('should round-trip through serialization', () => {
    const state: SpatialCRDTState = {
      positions: { player1: { x: 10, y: 20, timestamp: 1000, peerId: 'peer-1' } },
      version: 1,
    };
    const json = serializeCRDTState(state);
    const restored = deserializeCRDTState(json);
    expect(restored.positions.player1.x).toBe(10);
    expect(restored.positions.player1.peerId).toBe('peer-1');
  });

  it('should throw on invalid structure (missing positions)', () => {
    expect(() => deserializeCRDTState(JSON.stringify({ version: 1 })))
      .toThrow('Invalid state structure');
  });

  it('should throw on unsupported version', () => {
    expect(() => deserializeCRDTState(JSON.stringify({ positions: {}, version: 99 })))
      .toThrow('Unsupported version');
  });

  it('should throw on invalid position data', () => {
    const bad = JSON.stringify({
      positions: { e1: { x: 'not-a-number', y: 0, timestamp: 0, peerId: '' } },
      version: 1,
    });
    expect(() => deserializeCRDTState(bad)).toThrow('Invalid position');
  });
});

describe('createEmptySpatialState', () => {
  it('should return empty positions with version 1', () => {
    const state = createEmptySpatialState();
    expect(state).toEqual({ positions: {}, version: 1 });
  });
});
