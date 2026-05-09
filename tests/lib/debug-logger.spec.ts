import { describe, it, expect } from 'vitest';
import { redact, createDebugLogger } from '@/lib/debug-logger';

describe('debug-logger', () => {
  describe('redact', () => {
    it('should return primitives unchanged', () => {
      expect(redact('hello')).toBe('hello');
      expect(redact(42)).toBe(42);
      expect(redact(null)).toBeNull();
      expect(redact(undefined)).toBeUndefined();
      expect(redact(true)).toBe(true);
    });

    it('should redact sensitive keys in objects', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        token: 'abc',
        apiKey: 'xyz',
      };
      const result = redact(data) as Record<string, unknown>;
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
    });

    it('should redact case-insensitively', () => {
      const data = { PASSWORD: 'hello', Bearer: 'token', AUTH_header: 'val' };
      const result = redact(data) as Record<string, unknown>;
      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.Bearer).toBe('[REDACTED]');
      expect(result.AUTH_header).toBe('[REDACTED]');
    });

    it('should handle nested objects recursively', () => {
      const data = {
        user: {
          name: 'alice',
          secret: 'hidden',
        },
      };
      const result = redact(data) as Record<string, Record<string, unknown>>;
      expect(result.user.name).toBe('alice');
      expect(result.user.secret).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const data = [{ password: 'x' }, { name: 'test' }];
      const result = redact(data) as Record<string, unknown>[];
      expect(result[0].password).toBe('[REDACTED]');
      expect(result[1].name).toBe('test');
    });

    it('should handle empty objects', () => {
      expect(redact({})).toEqual({});
    });

    it('should handle empty arrays', () => {
      expect(redact([])).toEqual([]);
    });
  });

  describe('createDebugLogger', () => {
    it('should return a function', () => {
      const logger = createDebugLogger('test-location');
      expect(typeof logger).toBe('function');
    });

    it('should create logger with hypothesisId', () => {
      const logger = createDebugLogger('test-location', 'H1');
      expect(typeof logger).toBe('function');
    });

    it('should not throw when called', () => {
      const logger = createDebugLogger('test-location');
      expect(() => logger('test message', { key: 'value' })).not.toThrow();
    });

    it('should not throw when called without data', () => {
      const logger = createDebugLogger('test-location');
      expect(() => logger('simple message')).not.toThrow();
    });
  });
});
