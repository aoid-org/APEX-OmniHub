import { describe, it, expect } from 'vitest';
import {
  generateIdempotencyKey,
  generateDeterministicKey,
  createEvent,
  isValidEventEnvelope,
  validateEvent,
  SCHEMA_VERSION,
  ALL_APPS,
  APPS_WITH_REAL_IMPL,
  APPS_STUBBED,
} from '../contracts';
import type { EventEnvelope } from '../contracts';

// ============================================================================
// generateIdempotencyKey
// ============================================================================
describe('generateIdempotencyKey', () => {
  it('generates a deterministic key with nonce', () => {
    const ts = new Date('2025-01-01T00:00:00Z');
    const key = generateIdempotencyKey('tenant-1', 'omnilink:system.started', ts, 'abc123');
    expect(key).toBe(`tenant-1-omnilink:system.started-${ts.getTime()}-abc123`);
  });

  it('throws when nonce is empty string', () => {
    const ts = new Date();
    expect(() => generateIdempotencyKey('t', 'omnilink:system.started', ts, '')).toThrow(
      'nonce is required'
    );
  });

  it('throws when nonce is not provided (default empty)', () => {
    const ts = new Date();
    expect(() => generateIdempotencyKey('t', 'omnilink:system.started', ts)).toThrow(
      'nonce is required'
    );
  });

  it('includes timestamp milliseconds in key', () => {
    const ts = new Date(1700000000000);
    const key = generateIdempotencyKey('t', 'flowbills:invoice.created', ts, 'x');
    expect(key).toContain('1700000000000');
  });
});

// ============================================================================
// generateDeterministicKey
// ============================================================================
describe('generateDeterministicKey', () => {
  it('generates the same key for same inputs', () => {
    const ts = new Date('2025-06-01T00:00:00Z');
    const key1 = generateDeterministicKey('tenant', 'tradeline247:call.received', ts, 42, 1);
    const key2 = generateDeterministicKey('tenant', 'tradeline247:call.received', ts, 42, 1);
    expect(key1).toBe(key2);
  });

  it('generates different keys for different seeds', () => {
    const ts = new Date('2025-06-01T00:00:00Z');
    const key1 = generateDeterministicKey('tenant', 'tradeline247:call.received', ts, 1, 1);
    const key2 = generateDeterministicKey('tenant', 'tradeline247:call.received', ts, 2, 1);
    expect(key1).not.toBe(key2);
  });

  it('generates different keys for different sequences', () => {
    const ts = new Date();
    const key1 = generateDeterministicKey('t', 'omnilink:event.routed', ts, 10, 1);
    const key2 = generateDeterministicKey('t', 'omnilink:event.routed', ts, 10, 2);
    expect(key1).not.toBe(key2);
  });
});

// ============================================================================
// createEvent builder
// ============================================================================
describe('createEvent builder', () => {
  const makeFullEvent = () =>
    createEvent('tenant-1', 'omnilink:system.started')
      .correlationId('corr-123')
      .idempotencyKey('tenant-1-omnilink:system.started-123-nonce')
      .source('omnilink')
      .payload({ version: '1.0.0', environment: 'sandbox', capabilities: [] })
      .build();

  it('builds a complete event envelope', () => {
    const event = makeFullEvent();
    expect(event.tenantId).toBe('tenant-1');
    expect(event.eventType).toBe('omnilink:system.started');
    expect(event.correlationId).toBe('corr-123');
    expect(event.source).toBe('omnilink');
    expect(event.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('aligns trace traceId with correlationId', () => {
    const event = makeFullEvent();
    expect(event.trace.traceId).toBe('corr-123');
  });

  it('supports target()', () => {
    const event = createEvent('t', 'omnilink:event.routed')
      .correlationId('c')
      .idempotencyKey('t-omnilink:event.routed-0-n')
      .source('omnilink')
      .target('omnihub')
      .payload({ sourceEvent: 'x', targetApps: ['omnihub'], routingDecision: 'route' })
      .build();
    expect(event.target).toBe('omnihub');
  });

  it('supports target() with array', () => {
    const event = createEvent('t', 'omnilink:event.routed')
      .correlationId('c')
      .idempotencyKey('t-omnilink:event.routed-0-n')
      .source('omnilink')
      .target(['omnihub', 'tradeline247'])
      .payload({ sourceEvent: 'x', targetApps: ['omnihub'], routingDecision: 'route' })
      .build();
    expect(event.target).toEqual(['omnihub', 'tradeline247']);
  });

  it('supports chaos()', () => {
    const event = createEvent('t', 'omnilink:system.started')
      .correlationId('c')
      .idempotencyKey('t-x-0-n')
      .source('omnilink')
      .chaos({ isDuplicate: true, injectedDelayMs: 100 })
      .payload({ version: '1', environment: 'sandbox', capabilities: [] })
      .build();
    expect(event.chaos?.isDuplicate).toBe(true);
    expect(event.chaos?.injectedDelayMs).toBe(100);
  });

  it('throws when correlationId is missing', () => {
    expect(() =>
      createEvent('t', 'omnilink:system.started')
        .idempotencyKey('k')
        .source('omnilink')
        .payload({})
        .build()
    ).toThrow('correlationId is required');
  });

  it('throws when idempotencyKey is missing', () => {
    expect(() =>
      createEvent('t', 'omnilink:system.started')
        .correlationId('c')
        .source('omnilink')
        .payload({})
        .build()
    ).toThrow('idempotencyKey is required');
  });

  it('throws when source is missing', () => {
    expect(() =>
      createEvent('t', 'omnilink:system.started')
        .correlationId('c')
        .idempotencyKey('k')
        .payload({})
        .build()
    ).toThrow('source app is required');
  });

  it('throws when payload is missing', () => {
    expect(() =>
      createEvent('t', 'omnilink:system.started')
        .correlationId('c')
        .idempotencyKey('k')
        .source('omnilink')
        .build()
    ).toThrow('payload is required');
  });
});

// ============================================================================
// isValidEventEnvelope
// ============================================================================
describe('isValidEventEnvelope', () => {
  const validEnvelope: EventEnvelope = {
    eventId: 'evt-1',
    correlationId: 'corr-1',
    idempotencyKey: 'tenant-omnilink:system.started-123-nonce',
    tenantId: 'tenant-1',
    eventType: 'omnilink:system.started',
    payload: {},
    timestamp: new Date().toISOString(),
    source: 'omnilink',
    trace: { traceId: 'trace-1', spanId: 'span-1' },
    schemaVersion: '1.0.0',
  };

  it('returns true for a valid envelope', () => {
    expect(isValidEventEnvelope(validEnvelope)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidEventEnvelope(null)).toBe(false);
  });

  it('returns false for non-object (string)', () => {
    expect(isValidEventEnvelope('not-an-object')).toBe(false);
  });

  it('returns false for non-object (number)', () => {
    expect(isValidEventEnvelope(42)).toBe(false);
  });

  it('returns false when eventId is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, eventId: undefined })).toBe(false);
  });

  it('returns false when correlationId is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, correlationId: undefined })).toBe(false);
  });

  it('returns false when idempotencyKey is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, idempotencyKey: undefined })).toBe(false);
  });

  it('returns false when tenantId is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, tenantId: undefined })).toBe(false);
  });

  it('returns false when eventType is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, eventType: undefined })).toBe(false);
  });

  it('returns false when timestamp is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, timestamp: undefined })).toBe(false);
  });

  it('returns false when source is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, source: undefined })).toBe(false);
  });

  it('returns false when payload is undefined', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, payload: undefined })).toBe(false);
  });

  it('returns false when trace is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, trace: undefined as never })).toBe(false);
  });

  it('returns false when schemaVersion is missing', () => {
    expect(isValidEventEnvelope({ ...validEnvelope, schemaVersion: undefined as never })).toBe(false);
  });

  it('returns true when payload is null (truthy check: payload !== undefined)', () => {
    // payload === null still satisfies payload !== undefined
    expect(isValidEventEnvelope({ ...validEnvelope, payload: null })).toBe(true);
  });
});

// ============================================================================
// validateEvent
// ============================================================================
describe('validateEvent', () => {
  const validEvent: EventEnvelope = {
    eventId: 'evt-1',
    correlationId: 'corr-1',
    idempotencyKey: 'tenant-omnilink:system.started-123-nonce',
    tenantId: 'tenant-1',
    eventType: 'omnilink:system.started',
    payload: {},
    timestamp: new Date().toISOString(),
    source: 'omnilink',
    trace: { traceId: 'trace-1', spanId: 'span-1' },
    schemaVersion: '1.0.0',
  };

  it('returns valid=true for a complete event', () => {
    const result = validateEvent(validEvent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('collects error for missing eventId', () => {
    const result = validateEvent({ ...validEvent, eventId: '' });
    expect(result.errors).toContain('eventId is required');
  });

  it('collects error for missing correlationId', () => {
    const result = validateEvent({ ...validEvent, correlationId: '' });
    expect(result.errors).toContain('correlationId is required');
  });

  it('collects error for missing idempotencyKey', () => {
    const result = validateEvent({ ...validEvent, idempotencyKey: '' });
    expect(result.errors).toContain('idempotencyKey is required');
  });

  it('collects error for missing tenantId', () => {
    const result = validateEvent({ ...validEvent, tenantId: '' });
    expect(result.errors).toContain('tenantId is required');
  });

  it('collects error for missing eventType', () => {
    const result = validateEvent({ ...validEvent, eventType: '' as never });
    expect(result.errors).toContain('eventType is required');
  });

  it('collects error for missing source', () => {
    const result = validateEvent({ ...validEvent, source: '' as never });
    expect(result.errors).toContain('source is required');
  });

  it('collects error for null payload', () => {
    const result = validateEvent({ ...validEvent, payload: null as unknown as undefined });
    expect(result.errors).toContain('payload is required');
  });

  it('collects error for missing timestamp', () => {
    const result = validateEvent({ ...validEvent, timestamp: '' });
    expect(result.errors).toContain('timestamp is required');
  });

  it('collects error for missing trace', () => {
    const result = validateEvent({ ...validEvent, trace: null as never });
    expect(result.errors).toContain('trace is required');
  });

  it('collects error for missing schemaVersion', () => {
    const result = validateEvent({ ...validEvent, schemaVersion: '' });
    expect(result.errors).toContain('schemaVersion is required');
  });

  it('collects error for invalid timestamp format', () => {
    const result = validateEvent({ ...validEvent, timestamp: 'not-a-date' });
    expect(result.errors).toContain('timestamp must be valid ISO 8601');
  });

  it('collects error for unknown source app', () => {
    const result = validateEvent({ ...validEvent, source: 'unknown-app' as never });
    expect(result.errors.some((e) => e.includes('source must be one of'))).toBe(true);
  });

  it('collects error for idempotencyKey without dash', () => {
    const result = validateEvent({ ...validEvent, idempotencyKey: 'nodash' });
    expect(result.errors).toContain(
      'idempotencyKey must follow format: {tenantId}-{eventType}-{timestamp}-{nonce}'
    );
  });

  it('returns valid=false when there are multiple errors', () => {
    const result = validateEvent({
      ...validEvent,
      eventId: '',
      correlationId: '',
      tenantId: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// Constants
// ============================================================================
describe('constants', () => {
  it('SCHEMA_VERSION is 1.0.0', () => {
    expect(SCHEMA_VERSION).toBe('1.0.0');
  });

  it('ALL_APPS contains 12 entries', () => {
    expect(ALL_APPS).toHaveLength(12);
  });

  it('APPS_WITH_REAL_IMPL and APPS_STUBBED are subsets of ALL_APPS', () => {
    for (const app of APPS_WITH_REAL_IMPL) {
      expect(ALL_APPS).toContain(app);
    }
    for (const app of APPS_STUBBED) {
      expect(ALL_APPS).toContain(app);
    }
  });
});
