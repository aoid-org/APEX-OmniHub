import { describe, expect, it } from 'vitest';
import { generateSecureId } from '../../src/lib/security';

describe('generateSecureId', () => {
  it('generates a valid UUID v4', () => {
    const id = generateSecureId();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidV4Regex);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSecureId());
    }
    expect(ids.size).toBe(100);
  });
});
