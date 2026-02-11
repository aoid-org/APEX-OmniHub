import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '@/omniconnect/policy/policy-engine';
import { AppFilterProfile } from '@/omniconnect/types/policy';
import { CanonicalEvent, EventType, DataClassification } from '@/omniconnect/types/canonical';

describe('PolicyEngine', () => {
  let pe: PolicyEngine;
  const appId = 'app-1';

  const mkEv = (
    id: string,
    type: EventType,
    p: Record<string, unknown> = {},
    m: Record<string, unknown> = {},
    classification: DataClassification = DataClassification.PUBLIC
  ): CanonicalEvent => {
    // Ensure payload meets schema requirements for validation tests
    const validPayload = { ...p };

    if (type === EventType.COMMENT) {
      if (!validPayload.text) validPayload.text = 'valid comment text';
      if (!validPayload.authorId) validPayload.authorId = 'user-1';
      if (!validPayload.targetId) validPayload.targetId = 'post-1';
    }

    if (type === EventType.MESSAGE) {
      if (!validPayload.content) validPayload.content = 'valid message content';
      if (!validPayload.senderId) validPayload.senderId = 'user-1';
    }

    return {
      eventId: id, correlationId: 'c1', tenantId: 't1', userId: 'u1', source: 's1', provider: 'p1',
      externalId: 'ext-' + id, eventType: type, classification, timestamp: new Date().toISOString(),
      consentFlags: {}, metadata: m, payload: validPayload
    };
  };

  const baseProf: AppFilterProfile = {
    appId, allowedEventTypes: [EventType.SOCIAL_POST_VIEWED, EventType.COMMENT],
    piiHandling: 'allow', emotionalDataEnabled: true,
    contentCategories: { allow: [], deny: [] },
    rateLimit: { eventsPerMinute: 100, burstLimit: 10 }
  };

  beforeEach(() => { pe = new PolicyEngine(); });

  it('works without profile', async () => {
    const res = await pe.filter([mkEv('1', EventType.FOLLOW)], 'none', 'c1');
    expect(res).toHaveLength(1);
  });

  it('filters by type', async () => {
    await pe.setProfile(baseProf);
    const res = await pe.filter([mkEv('1', EventType.SOCIAL_POST_VIEWED), mkEv('2', EventType.FOLLOW)], appId, 'c1');
    expect(res).toHaveLength(1);
    expect(res[0].eventId).toBe('1');
  });

  it('filters by category', async () => {
    const data = [
      { d: ['bad'], a: [], ev: mkEv('1', EventType.COMMENT, { text: 'bad' }), n: 0 },
      { d: [], a: ['good'], ev: mkEv('2', EventType.COMMENT, { text: 'ok' }), n: 0 },
      { d: [], a: ['good'], ev: mkEv('3', EventType.COMMENT, { text: 'good' }), n: 1 }
    ];

    for (const item of data) {
      await pe.setProfile({ ...baseProf, contentCategories: { allow: item.a, deny: item.d } });
      expect(await pe.filter([item.ev], appId, 'c1')).toHaveLength(item.n);
    }
  });

  it('strips emotions', async () => {
    await pe.setProfile({ ...baseProf, emotionalDataEnabled: false });
    const res = await pe.filter([mkEv('1', EventType.COMMENT, { sentiment: 'pos' }, { mood: 'joy' })], appId, 'c1');
    expect(res[0].payload.sentiment).toBeUndefined();
    expect(res[0].metadata.mood).toBeUndefined();
  });

  it('masks pii', async () => {
    await pe.setProfile({ ...baseProf, piiHandling: 'mask' });
    const res = await pe.filter([mkEv('1', EventType.COMMENT, { email: 'a@b.c' })], appId, 'c1');
    expect(res[0].payload.email).toBe('***');
  });

  it('redacts pii', async () => {
    await pe.setProfile({ ...baseProf, piiHandling: 'redact' });
    const res = await pe.filter([mkEv('1', EventType.COMMENT, { phone: '123' })], appId, 'c1');
    expect(res[0].payload.phone).toBe('[REDACTED]');
  });

  describe('validateEvent', () => {
    it('passes valid event', async () => {
      await pe.setProfile(baseProf);
      const res = await pe.validateEvent(mkEv('1', EventType.COMMENT), appId);
      expect(res.valid).toBe(true);
      expect(res.reasons).toHaveLength(0);
    });

    it('fails on schema violation (missing required field)', async () => {
      await pe.setProfile(baseProf);
      // Passing empty string for text, but since we pass explicit object, mkEv won't overwrite it with default
      // Wait, mkEv logic: if (!validPayload.text) set default.
      // If I pass { text: '' }, validPayload.text is ''. !'' is true. So it will set default.
      // I need to pass something that fails Zod but passes mkEv check, or modify mkEv to respect explicit invalid values?
      // Or just assume mkEv ensures "valid structure" by default, so I need to explicitly break it.
      // My mkEv uses default logic only if property is missing/falsy.
      // Let's rely on type assertions to force invalid payload structure that bypasses mkEv defaults?
      // Or just change mkEv to use `Object.assign` or spread and only add defaults if keys missing.
      // Current mkEv: `if (!validPayload.text) ...` check values.
      // Zod schema requires `min(1)`.
      // If I pass { text: ' ' }, it's truthy (space). Zod min(1) allows space? Yes usually.
      // Let's try missing field: `authorId`.
      // `if (!validPayload.authorId) ...`. If I pass `undefined`, it sets default.
      // I'll make mkEv smarter or just manually construct event for failure tests.

      const ev = mkEv('1', EventType.COMMENT);
      // Manually break it
      delete (ev.payload as Record<string, unknown>).text;

      const res = await pe.validateEvent(ev, appId);
      expect(res.valid).toBe(false);
      expect(res.reasons.some(r => r.includes('Schema violation') && r.includes('text'))).toBe(true);
    });

    it('fails on consent missing for sensitive data', async () => {
      await pe.setProfile(baseProf);
      const ev = mkEv('1', EventType.COMMENT, {}, {}, DataClassification.SENSITIVE);
      const res = await pe.validateEvent(ev, appId);
      expect(res.valid).toBe(false);
      expect(res.reasons.some(r => r.includes('Consent missing'))).toBe(true);
    });

    it('passes sensitive data with explicit opt-in', async () => {
      await pe.setProfile(baseProf);
      const ev = mkEv('1', EventType.COMMENT, {}, {}, DataClassification.SENSITIVE);
      ev.consentFlags.explicit_opt_in = true;
      const res = await pe.validateEvent(ev, appId);
      expect(res.valid).toBe(true);
    });

    it('fails on future timestamp', async () => {
      await pe.setProfile(baseProf);
      const ev = mkEv('1', EventType.COMMENT);
      ev.timestamp = new Date(Date.now() + 10000).toISOString();
      const res = await pe.validateEvent(ev, appId);
      expect(res.valid).toBe(false);
      expect(res.reasons.some(r => r.includes('future'))).toBe(true);
    });

    it('fails on stale timestamp', async () => {
      await pe.setProfile(baseProf);
      const ev = mkEv('1', EventType.COMMENT);
      ev.timestamp = new Date(Date.now() - 25 * 3600 * 1000).toISOString(); // 25 hours ago
      const res = await pe.validateEvent(ev, appId);
      expect(res.valid).toBe(false);
      expect(res.reasons.some(r => r.includes('too old'))).toBe(true);
    });

    it('allows stale timestamp for historical import', async () => {
      // Add HISTORICAL_IMPORT to allowed types in profile
      const prof = { ...baseProf, allowedEventTypes: [...baseProf.allowedEventTypes, EventType.HISTORICAL_IMPORT] };
      await pe.setProfile(prof);

      const ev = mkEv('1', EventType.HISTORICAL_IMPORT, {}, {}, DataClassification.PUBLIC);
      ev.timestamp = new Date(Date.now() - 25 * 3600 * 1000).toISOString();

      const res = await pe.validateEvent(ev, appId);
      expect(res.valid).toBe(true);
    });

    it('fails on policy violation (event type not allowed)', async () => {
      await pe.setProfile(baseProf);
      const ev = mkEv('1', EventType.FOLLOW); // FOLLOW is not in baseProf
      const res = await pe.validateEvent(ev, appId);
      expect(res.valid).toBe(false);
      expect(res.reasons.some(r => r.includes('Policy violation'))).toBe(true);
    });
  });
});
