import { describe, it, expect, vi } from 'vitest';
import { SemanticTranslator } from '../../src/omniconnect/translation/translator';
import { EventType, DataClassification, CanonicalEvent } from '../../src/omniconnect/types/canonical';

describe('Universal Translation Engine (UTE) Stress Tests', () => {
  const translator = new SemanticTranslator();
  const appId = 'target-app-1';
  const correlationId = 'test-corr-123';

  it('should gracefully drop events missing required canonical fields', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const malformedPayload = {
      foo: 'bar',
      garbageData: true,
      nested: { deeply: 'junk' }
    } as unknown as CanonicalEvent;

    const results = await translator.translate([malformedPayload], appId, correlationId);
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();

    expect(results).toHaveLength(1);
    expect(results[0].payload._translation_status).toBe('DROPPED');
    expect(results[0].payload._error).toContain('Malformed Payload');
    expect(results[0].metadata.risk_lane).toBe('RED');
    expect(results[0].metadata.audit_reason).toBe('schema_validation_failed');
  });

  it('should gracefully drop events with incorrect data types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const malformedTypePayload = {
      eventId: 'evt-1',
      correlationId: 'corr-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      source: 'test-source',
      provider: 'test-provider',
      externalId: 'ext-1',
      eventType: 'NOT_A_REAL_TYPE' as EventType,
      classification: 999 as unknown as DataClassification,
      timestamp: new Date().toISOString(),
      consentFlags: {},
      metadata: {},
      payload: { valid: 'data' }
    } as CanonicalEvent;

    const results = await translator.translate([malformedTypePayload], appId, correlationId);
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();

    expect(results).toHaveLength(1);
    expect(results[0].payload._translation_status).toBe('DROPPED');
  });

  it('should process perfectly formed canonical events', async () => {
    const validEvent: CanonicalEvent = {
        eventId: 'valid-1',
        correlationId: 'corr-valid-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'test-source',
        provider: 'test-provider',
        externalId: 'ext-1',
        eventType: EventType.SOCIAL_POST_VIEWED,
        classification: DataClassification.PUBLIC,
        timestamp: new Date().toISOString(),
        consentFlags: {},
        metadata: {},
        payload: { message: 'Hello Translator' }
    };

    const results = await translator.translate([validEvent], appId, correlationId);

    expect(results).toHaveLength(1);
    expect(results[0].payload._translation_status).toBeUndefined();
    expect(results[0].metadata.verified).toBe(true);
    // Empty metadata → defaults to [en], which prepends "[en] " to "Hello Translator"
    expect(results[0].payload.message).toBe('[en] Hello Translator');
  });

  it('should translate known strings via deterministic dictionary', async () => {
    const validEvent: CanonicalEvent = {
        eventId: 'valid-2',
        correlationId: 'corr-valid-2',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'test-source',
        provider: 'test-provider',
        externalId: 'ext-2',
        eventType: EventType.SOCIAL_POST_VIEWED,
        classification: DataClassification.PUBLIC,
        timestamp: new Date().toISOString(),
        consentFlags: {},
        metadata: { locale: 'fr-FR' },
        payload: { message: 'Hello Translator' }
    };

    const results = await translator.translate([validEvent], appId, correlationId);
    expect(results[0].payload.message).toBe('Bonjour Traducteur');
  });

  it('should NOT translate technical identifiers or UUIDs', async () => {
    const validEvent: CanonicalEvent = {
        eventId: 'valid-3',
        correlationId: 'corr-valid-3',
        tenantId: 'tenant-1',
        userId: 'user-1',
        source: 'test-source',
        provider: 'test-provider',
        externalId: 'ext-3',
        eventType: EventType.SOCIAL_POST_VIEWED,
        classification: DataClassification.PUBLIC,
        timestamp: new Date().toISOString(),
        consentFlags: {},
        metadata: { locale: 'fr-FR' },
        payload: { 
          message: 'Settings', 
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@apex.com',
          url: 'https://apex.com',
          enum: 'SYSTEM_ERROR'
        }
    };

    const results = await translator.translate([validEvent], appId, correlationId);
    expect(results[0].payload.message).toBe('Paramètres'); // Translated
    expect(results[0].payload.uuid).toBe('123e4567-e89b-12d3-a456-426614174000'); // Unchanged
    expect(results[0].payload.email).toBe('test@apex.com'); // Unchanged
    expect(results[0].payload.url).toBe('https://apex.com'); // Unchanged
    expect(results[0].payload.enum).toBe('SYSTEM_ERROR'); // Unchanged
  });
});
