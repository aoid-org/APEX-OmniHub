/**
 * TDD: sanitizeBackendPayload — pure function, zero side-effects
 *
 * Written FAILING first. Drives the export of sanitizeBackendPayload
 * from useOmniDashAction so it can be independently verified.
 *
 * Run: vitest src/omnidash/tests/sanitizeBackendPayload.spec.ts
 */
import { describe, it, expect } from 'vitest';
import { sanitizeBackendPayload } from '../useOmniDashAction';

describe('sanitizeBackendPayload — credential key stripping', () => {
  const CREDENTIAL_KEYS = [
    'secret',
    'secretKey',
    'SECRET_KEY',
    'token',
    'access_token',
    'TOKEN',
    'key',
    'apiKey',
    'api_key',
    'password',
    'PASSWORD',
    'credential',
    'credentials',
    'private',
    'privateKey',
    'bearer',
    'bearerToken',
  ];

  for (const credKey of CREDENTIAL_KEYS) {
    it(`strips key: '${credKey}'`, () => {
      const result = sanitizeBackendPayload({ [credKey]: 'super-secret', connector_id: 'abc' });
      expect(result).not.toHaveProperty(credKey);
      expect(result.connector_id).toBe('abc');
    });
  }

  it('preserves safe keys untouched', () => {
    const raw = {
      connector_id: 'conn_123',
      provider: 'QuickBooks',
      expires_at: 9999999999,
      status: 'active',
    };
    expect(sanitizeBackendPayload(raw)).toEqual(raw);
  });

  it('returns empty object when all keys are credentials', () => {
    expect(sanitizeBackendPayload({ token: 'x', secret: 'y', password: 'z' })).toEqual({});
  });

  it('handles empty input without throwing', () => {
    expect(sanitizeBackendPayload({})).toEqual({});
  });

  it('is non-mutating — does not modify the original object', () => {
    const original = { token: 'secret-value', connector_id: 'abc' };
    const copy = { ...original };
    sanitizeBackendPayload(original);
    expect(original).toEqual(copy);
  });

  it('strip is case-insensitive — BEARER and bEaReR are both stripped', () => {
    const result = sanitizeBackendPayload({ BEARER: 'val', bEaReR: 'val2', name: 'ok' });
    expect(result).not.toHaveProperty('BEARER');
    expect(result).not.toHaveProperty('bEaReR');
    expect(result.name).toBe('ok');
  });
});
