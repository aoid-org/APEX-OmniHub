import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine, AppFilterProfile } from '@/omniconnect/policy/policy-engine';
import { CanonicalEvent, EventType } from '@/omniconnect/types/canonical';

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;
  const appId = 'test-app';

  const baseEvent: CanonicalEvent = {
    eventId: 'evt-1',
    correlationId: 'oc-123',
    tenantId: 'tenant-1',
    userId: 'user-1',
    source: 'meta',
    provider: 'meta_business',
    externalId: 'ext-1',
    eventType: EventType.SOCIAL_POST_VIEWED,
    timestamp: new Date().toISOString(),
    consentFlags: { analytics: true },
    metadata: {},
    payload: {
      text: 'Hello world',
      user_email: 'test@example.com'
    }
  };

  const fullProfile: AppFilterProfile = {
    appId: appId,
    allowedEventTypes: [EventType.SOCIAL_POST_VIEWED, EventType.COMMENT],
    piiHandling: 'allow',
    emotionalDataEnabled: true,
    contentCategories: {
      allow: [],
      deny: []
    },
    rateLimit: {
      eventsPerMinute: 100,
      burstLimit: 10
    }
  };

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  it('should return all events if no profile is found', async () => {
    const events = [baseEvent];
    const result = await policyEngine.filter(events, 'unknown-app', 'oc-123');
    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBe(baseEvent.eventId);
  });

  it('should filter events by allowedEventTypes', async () => {
    await policyEngine.setProfile(fullProfile);

    const events: CanonicalEvent[] = [
      { ...baseEvent, eventId: 'evt-1', eventType: EventType.SOCIAL_POST_VIEWED },
      { ...baseEvent, eventId: 'evt-2', eventType: EventType.FOLLOW }
    ];

    const result = await policyEngine.filter(events, appId, 'oc-123');
    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBe('evt-1');
  });

  it('should filter events by contentCategories (deny)', async () => {
    const profile: AppFilterProfile = {
      ...fullProfile,
      contentCategories: {
        allow: [],
        deny: ['spam', 'offensive']
      }
    };
    await policyEngine.setProfile(profile);

    const events: CanonicalEvent[] = [
      { ...baseEvent, eventId: 'evt-1', payload: { text: 'Normal post' } },
      { ...baseEvent, eventId: 'evt-2', payload: { text: 'This is spam' } }
    ];

    const result = await policyEngine.filter(events, appId, 'oc-123');
    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBe('evt-1');
  });

  it('should filter events by contentCategories (allow)', async () => {
    const profile: AppFilterProfile = {
      ...fullProfile,
      contentCategories: {
        allow: ['work', 'urgent'],
        deny: []
      }
    };
    await policyEngine.setProfile(profile);

    const events: CanonicalEvent[] = [
      { ...baseEvent, eventId: 'evt-1', payload: { text: 'Work meeting' } },
      { ...baseEvent, eventId: 'evt-2', payload: { text: 'Personal stuff' } }
    ];

    const result = await policyEngine.filter(events, appId, 'oc-123');
    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBe('evt-1');
  });

  it('should strip emotional data if emotionalDataEnabled is false', async () => {
    const profile: AppFilterProfile = {
      ...fullProfile,
      emotionalDataEnabled: false
    };
    await policyEngine.setProfile(profile);

    const eventWithEmotion: CanonicalEvent = {
      ...baseEvent,
      payload: {
        text: 'Happy day',
        sentiment: 'positive',
        emotion: 'joy'
      },
      metadata: {
        mood_score: 0.9
      }
    };

    const result = await policyEngine.filter([eventWithEmotion], appId, 'oc-123');
    expect(result).toHaveLength(1);
    expect(result[0].payload.sentiment).toBeUndefined();
    expect(result[0].payload.emotion).toBeUndefined();
    expect(result[0].metadata.mood_score).toBeUndefined();
    expect(result[0].payload.text).toBe('Happy day');
  });

  it('should redact PII if piiHandling is redact', async () => {
    const profile: AppFilterProfile = {
      ...fullProfile,
      piiHandling: 'redact'
    };
    await policyEngine.setProfile(profile);

    const eventWithPII: CanonicalEvent = {
      ...baseEvent,
      payload: {
        text: 'Contact me at test@example.com',
        email: 'test@example.com',
        phone: '123-456-7890'
      }
    };

    const result = await policyEngine.filter([eventWithPII], appId, 'oc-123');
    expect(result).toHaveLength(1);
    expect(result[0].payload.email).toBe('[REDACTED]');
    expect(result[0].payload.phone).toBe('[REDACTED]');
    // It should also redact PII inside text strings if possible, but let's start with fields
  });

  it('should mask PII if piiHandling is mask', async () => {
    const profile: AppFilterProfile = {
      ...fullProfile,
      piiHandling: 'mask'
    };
    await policyEngine.setProfile(profile);

    const eventWithPII: CanonicalEvent = {
      ...baseEvent,
      payload: {
        email: 'test@example.com'
      }
    };

    const result = await policyEngine.filter([eventWithPII], appId, 'oc-123');
    expect(result).toHaveLength(1);
    expect(result[0].payload.email).toBe('***');
  });

  describe('validateEvent', () => {
    it('should return true for valid event', async () => {
      await policyEngine.setProfile(fullProfile);
      const isValid = await policyEngine.validateEvent(baseEvent, appId);
      expect(isValid).toBe(true);
    });

    it('should return false for event with disallowed type', async () => {
      await policyEngine.setProfile(fullProfile);
      const invalidEvent = { ...baseEvent, eventType: EventType.FOLLOW };
      const isValid = await policyEngine.validateEvent(invalidEvent, appId);
      expect(isValid).toBe(false);
    });
  });
});
