import { describe, expect, it } from 'vitest';
import {
  generateCorrelationId,
  isValidCorrelationId,
  extractCorrelationId,
} from '../../src/omniconnect/utils/correlation';

describe('Correlation ID utilities', () => {
  describe('generateCorrelationId', () => {
    it('generates an ID with the correct prefix and length', () => {
      const id = generateCorrelationId();
      expect(id.startsWith('oc-')).toBe(true);
      expect(id).toHaveLength(39); // 'oc-' (3) + UUID (36)
    });

    it('generates unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidCorrelationId', () => {
    it('returns true for a valid correlation ID', () => {
      const validId = generateCorrelationId();
      expect(isValidCorrelationId(validId)).toBe(true);
    });

    it('returns false for an ID without the oc- prefix', () => {
      const validId = generateCorrelationId();
      const invalidId = validId.replace('oc-', 'xx-');
      expect(isValidCorrelationId(invalidId)).toBe(false);
    });

    it('returns false for an ID with incorrect length', () => {
      const validId = generateCorrelationId();
      const tooShort = validId.slice(0, 38);
      const tooLong = validId + 'a';
      expect(isValidCorrelationId(tooShort)).toBe(false);
      expect(isValidCorrelationId(tooLong)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isValidCorrelationId('')).toBe(false);
    });
  });

  describe('extractCorrelationId', () => {
    it('extracts a valid correlation ID from a full state string', () => {
      const id = generateCorrelationId();
      const state = `${id}.1234567890.nonce`;
      expect(extractCorrelationId(state)).toBe(id);
    });

    it('extracts a valid correlation ID when state is only the ID', () => {
      const id = generateCorrelationId();
      expect(extractCorrelationId(id)).toBe(id);
    });

    it('returns null when the state contains an invalid correlation ID', () => {
      const invalidId = 'oc-invalid-length';
      const state = `${invalidId}.1234567890.nonce`;
      expect(extractCorrelationId(state)).toBeNull();
    });

    it('returns null when the state is an empty string', () => {
      expect(extractCorrelationId('')).toBeNull();
    });

    it('returns null when the first part of state is empty', () => {
      expect(extractCorrelationId('.1234567890.nonce')).toBeNull();
    });
  });
});
