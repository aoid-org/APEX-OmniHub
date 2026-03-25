import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/security', () => ({
  generateSecureId: () => '12345678-1234-1234-1234-1234567890ab',
}));

import {
  extractCorrelationId,
  generateCorrelationId,
  isValidCorrelationId,
} from '@/omniconnect/utils/correlation';

describe('correlation utilities', () => {
  it('generates OmniConnect-prefixed correlation IDs', () => {
    expect(generateCorrelationId()).toBe('oc-12345678-1234-1234-1234-1234567890ab');
  });

  it('validates correlation IDs strictly', () => {
    expect(isValidCorrelationId('oc-12345678-1234-1234-1234-1234567890ab')).toBe(true);
    expect(isValidCorrelationId('bad-12345678-1234-1234-1234-1234567890ab')).toBe(false);
    expect(isValidCorrelationId('oc-short')).toBe(false);
  });

  it('extracts a valid correlation ID from OAuth state and rejects invalid values', () => {
    expect(
      extractCorrelationId('oc-12345678-1234-1234-1234-1234567890ab.1700000000.randomnonce'),
    ).toBe('oc-12345678-1234-1234-1234-1234567890ab');
    expect(extractCorrelationId('bad-value.1700000000.randomnonce')).toBeNull();
  });
});
