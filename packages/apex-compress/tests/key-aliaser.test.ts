import { describe, it, expect } from 'vitest';
import { buildKeyAliasMap, aliasJsonKeys, inflateJsonKeys } from '../src/core/key-aliaser';

describe('Key Aliaser', () => {
  it('generates bidirectional maps', () => {
    const keys = ['id', 'user_id', 'timestamp'];
    const map = buildKeyAliasMap(keys);
    
    // 'id' is too short, should not be aliased
    expect(map.compress['id']).toBeUndefined();
    
    // 'user_id' and 'timestamp' get aliased to 'a' and 'b'
    expect(map.compress['user_id']).toBe('a');
    expect(map.compress['timestamp']).toBe('b');
    
    expect(map.inflate['a']).toBe('user_id');
    expect(map.inflate['b']).toBe('timestamp');
  });

  it('aliases and inflates nested objects', () => {
    const original = { id: 1, user_id: 100, data: { timestamp: 123 } };
    const map = buildKeyAliasMap(['id', 'user_id', 'data', 'timestamp']);
    
    const aliased = aliasJsonKeys(original, map.compress) as Record<string, unknown>;
    expect(aliased.id).toBe(1); // untouched
    expect(aliased.a).toBe(100); // user_id
    expect((aliased.b as Record<string, unknown>).c).toBe(123); // data -> timestamp
    
    const inflated = inflateJsonKeys(aliased, map.inflate);
    expect(inflated).toEqual(original);
  });
});
