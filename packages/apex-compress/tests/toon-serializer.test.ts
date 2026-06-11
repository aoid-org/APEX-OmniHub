import { describe, it, expect } from 'vitest';
import { serializeToTOON, deserializeFromTOON, serializeTabularTOON, deserializeTabularTOON } from '../src/core/toon-serializer';

describe('TOON Serializer', () => {
  it('roundtrips flat JSON', () => {
    const obj = { name: 'Alice', active: true, score: 95.5, role: null };
    const toon = serializeToTOON(obj);
    expect(toon).toBe('name:Alice|active:T|score:95.50|role:~');
    expect(deserializeFromTOON(toon)).toEqual({ name: 'Alice', active: true, score: 95.5, role: null });
  });

  it('roundtrips nested JSON', () => {
    const obj = { user: { id: 1, name: 'Bob' }, tags: ['admin', 'beta'] };
    const toon = serializeToTOON(obj);
    expect(toon).toBe('user:{id:1|name:Bob}|tags:[admin,beta]');
    expect(deserializeFromTOON(toon)).toEqual(obj);
  });

  it('handles quotes safely', () => {
    const obj = { text: 'Hello|World:Testing' };
    const toon = serializeToTOON(obj);
    expect(toon).toBe('text:"Hello|World:Testing"');
    expect(deserializeFromTOON(toon)).toEqual(obj);
  });

  it('roundtrips tabular arrays', () => {
    const arr = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    const toon = serializeTabularTOON('users', arr);
    expect(toon).toBe('users[2]{id,name}:\n1,Alice\n2,Bob');
    expect(deserializeTabularTOON(toon)).toEqual(arr);
  });
});
