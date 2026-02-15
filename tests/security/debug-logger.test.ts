import { describe, it, expect } from 'vitest';
import { redact } from '@/lib/debug-logger';

describe('debug-logger redaction', () => {
  it('redacts sensitive fields', () => {
    const payload = {
      user: 'alice',
      token: 'test_token_value',
      nested: { password: 'test_password_value' },
    };
    const result = redact(payload);
    expect(result).toEqual({
      user: 'alice',
      token: '[REDACTED]',
      nested: { password: '[REDACTED]' },
    });
  });

  it('handles null/undefined gracefully', () => {
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });

  it('handles arrays', () => {
    const payload = [
      { key: 'test_key_value' },
      { public: 'data' }
    ];
    const result = redact(payload);
    expect(result).toEqual([
      { key: '[REDACTED]' },
      { public: 'data' }
    ]);
  });

  it('handles non-object values', () => {
    expect(redact('string')).toBe('string');
    expect(redact(123)).toBe(123);
  });
});
