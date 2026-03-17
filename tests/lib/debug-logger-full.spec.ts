import { describe, it, expect } from 'vitest';
import { redact, createDebugLogger, logError } from '../../src/lib/debug-logger';

describe('debug-logger (full coverage)', () => {
  describe('redact', () => {
    it('should return primitives unchanged', () => {
      expect(redact(null)).toBeNull();
      expect(redact(undefined)).toBeUndefined();
      expect(redact('hello')).toBe('hello');
      expect(redact(42)).toBe(42);
    });

    it('should redact sensitive keys', () => {
      const input = {
        username: 'user',
        password: 'secret123',
        apiToken: 'tok_abc',
        authKey: 'key123',
        bearerInfo: 'xyz',
        secretData: 'hidden',
      };

      const result = redact(input) as Record<string, unknown>;
      expect(result.username).toBe('user');
      expect(result.password).toBe('[REDACTED]');
      expect(result.apiToken).toBe('[REDACTED]');
      expect(result.authKey).toBe('[REDACTED]');
      expect(result.bearerInfo).toBe('[REDACTED]');
      expect(result.secretData).toBe('[REDACTED]');
    });

    it('should recursively redact nested objects', () => {
      const input = {
        config: {
          password: 'secret',
          host: 'localhost',
        },
      };

      const result = redact(input) as Record<string, Record<string, unknown>>;
      expect(result.config.password).toBe('[REDACTED]');
      expect(result.config.host).toBe('localhost');
    });

    it('should redact arrays recursively', () => {
      const input = [
        { password: 'a', name: 'test' },
        { token: 'b', id: 1 },
      ];

      const result = redact(input) as Record<string, unknown>[];
      expect(result[0].password).toBe('[REDACTED]');
      expect(result[0].name).toBe('test');
      expect(result[1].token).toBe('[REDACTED]');
      expect(result[1].id).toBe(1);
    });
  });

  describe('createDebugLogger', () => {
    it('should create a logger function', () => {
      const log = createDebugLogger('test-location', 'H1');
      expect(typeof log).toBe('function');
    });

    it('should not throw when called', () => {
      const log = createDebugLogger('test-location');
      expect(() => log('test message', { key: 'value' })).not.toThrow();
    });
  });

  describe('logError', () => {
    it('should handle Error objects', () => {
      expect(() => logError(new Error('test error'), { context: 'test' })).not.toThrow();
    });

    it('should handle string errors', () => {
      expect(() => logError('string error')).not.toThrow();
    });

    it('should handle non-Error objects', () => {
      expect(() => logError({ code: 500, msg: 'fail' })).not.toThrow();
    });
  });
});
