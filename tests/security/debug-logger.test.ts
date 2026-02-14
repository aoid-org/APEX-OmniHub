import { describe, it, expect } from 'vitest';
import { redact } from '@/lib/debug-logger';

describe('debug-logger redaction', () => {
  it('redacts sensitive fields', () => {
    const payload = { user: 'alice', token: 'secret123', nested: { password: 'pw' } };
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
    const arr = [{ auth: 'bearer xyz' }, { name: 'safe' }];
    const result = redact(arr);
    expect(result).toEqual([{ auth: '[REDACTED]' }, { name: 'safe' }]);
  });

  it('stops at max depth', () => {
    // Create deeply nested object
    let obj: Record<string, unknown> = { value: 'deep' };
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj };
    }
    const result = redact(obj);
    // Should not throw, should cap at max depth
    expect(result).toBeDefined();
  });

  it('redacts cookie, session, credential, bearer keys', () => {
    const payload = {
      cookie: 'abc',
      sessionId: 'xyz',
      credential: 'cred',
      bearerToken: 'tok',
      safeField: 'ok',
    };
    const result = redact(payload);
    expect(result).toEqual({
      cookie: '[REDACTED]',
      sessionId: '[REDACTED]',
      credential: '[REDACTED]',
      bearerToken: '[REDACTED]',
      safeField: 'ok',
    });
  });
});
