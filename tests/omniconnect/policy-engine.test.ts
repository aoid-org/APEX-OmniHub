import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '@/omniconnect/policy/policy-engine';
import { AppFilterProfile } from '@/omniconnect/types/policy';
import { CanonicalEvent, EventType } from '@/omniconnect/types/canonical';

describe('PolicyEngine', () => {
  let pe: PolicyEngine;
  const appId = 'app-1';

  const mkEv = (id: string, type: EventType, p = {}, m = {}): CanonicalEvent => ({
    eventId: id, correlationId: 'c1', tenantId: 't1', userId: 'u1', source: 's1', provider: 'p1',
    externalId: 'ext-' + id, eventType: type, timestamp: new Date().toISOString(),
    consentFlags: {}, metadata: m, payload: p
  });

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

  it('validates events correctly', async () => {
    await pe.setProfile(baseProf);
    expect(await pe.validateEvent(mkEv('1', EventType.COMMENT), appId)).toBe(true);
    expect(await pe.validateEvent(mkEv('2', EventType.FOLLOW), appId)).toBe(false);
  });
});
