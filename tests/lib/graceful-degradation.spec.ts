import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeParse, tryParse } from '@/lib/graceful-degradation';

describe('graceful-degradation', () => {
  beforeEach(() => {
    if (typeof vi !== 'undefined' && vi.clearAllMocks) {
      vi.clearAllMocks();
    }
  });

  describe('tryParse', () => {
    it('should return success true and data when JSON is valid', () => {
      const json = '{"key": "value"}';
      const result = tryParse<{ key: string }>(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ key: 'value' });
      }
    });

    it('should return success false and error when JSON is invalid', () => {
      const json = 'invalid json';
      const result = tryParse(json);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message.toLowerCase()).toContain('json');
      }
    });
  });

  describe('safeParse', () => {
    it('should return data when JSON is valid', () => {
      const json = '{"key": "value"}';
      const fallback = { key: 'fallback' };
      const result = safeParse(json, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback when JSON is invalid', () => {
      const json = 'invalid json';
      const fallback = { key: 'fallback' };
      const result = safeParse(json, fallback);

      expect(result).toEqual(fallback);
    });
  });
});
