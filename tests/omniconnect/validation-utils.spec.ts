import { describe, expect, it } from 'vitest';
import { EventType } from '@/omniconnect/types/canonical';
import {
  sanitizeEventPayload,
  validateCanonicalEvent,
  validateCorrelationId,
  validateSessionToken,
  validateTenantId,
  validateUserId,
} from '@/omniconnect/utils/validation';

describe('omniconnect validation utils', () => {
  it('validates canonical events with required fields', () => {
    const validEvent = {
      eventId: 'evt-1',
      correlationId: 'oc-12345678-1234-1234-1234-1234567890ab',
      tenantId: 'tenant-a',
      userId: 'user-a',
      source: 'omniport.text',
      provider: 'omniport',
      eventType: EventType.MESSAGE,
      timestamp: new Date().toISOString(),
      metadata: { lane: 'GREEN' },
      payload: { ok: true },
    };

    expect(validateCanonicalEvent(validEvent)).toBe(true);
  });

  it('rejects malformed canonical events', () => {
    expect(validateCanonicalEvent(null)).toBe(false);
    expect(
      validateCanonicalEvent({
        eventId: 'evt-1',
        correlationId: 'oc-1',
        tenantId: 'tenant',
        userId: 'user',
        source: 'source',
        provider: 'provider',
        eventType: 'not-a-real-event',
        timestamp: new Date().toISOString(),
      }),
    ).toBe(false);
    expect(
      validateCanonicalEvent({
        eventId: 'evt-1',
        correlationId: 'oc-1',
        tenantId: 'tenant',
        userId: 'user',
        source: 'source',
        provider: 'provider',
        eventType: EventType.MESSAGE,
        timestamp: new Date().toISOString(),
        metadata: 'not-object',
      }),
    ).toBe(false);
  });

  it('validates session tokens with date or date string expiry', () => {
    const withDate = {
      token: 'token',
      connectorId: 'conn-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      provider: 'provider',
      scopes: ['read'],
      expiresAt: new Date(),
    };
    const withStringDate = { ...withDate, expiresAt: new Date().toISOString() };

    expect(validateSessionToken(withDate)).toBe(true);
    expect(validateSessionToken(withStringDate)).toBe(true);
    expect(validateSessionToken({ ...withDate, scopes: 'read' })).toBe(false);
    expect(validateSessionToken({ ...withDate, expiresAt: 42 })).toBe(false);
  });

  it('sanitizes event payloads through shared sanitization layer', () => {
    const output = sanitizeEventPayload({
      password: 'super-secret',
      email: 'user@example.com',
      message: 'hello',
    });

    expect(output.password).toBe('[REDACTED]');
    expect(output.email).toBe('[REDACTED]');
    expect(output.message).toBe('hello');
  });

  it('validates correlation, tenant, and user identifiers', () => {
    const validCorrelation = `oc-${'a'.repeat(36)}`;
    expect(validateCorrelationId(validCorrelation)).toBe(true);
    expect(validateCorrelationId('oc-short')).toBe(false);
    expect(validateCorrelationId(`xx-${'a'.repeat(36)}`)).toBe(false);

    expect(validateTenantId('tenant-1')).toBe(true);
    expect(validateTenantId('')).toBe(false);
    expect(validateTenantId('a'.repeat(101))).toBe(false);

    expect(validateUserId('user-1')).toBe(true);
    expect(validateUserId('')).toBe(false);
    expect(validateUserId('a'.repeat(101))).toBe(false);
  });
});

