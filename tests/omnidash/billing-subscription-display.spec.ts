import { describe, it, expect } from 'vitest';
// Canonical edge helper (dependency-free; shared by Deno edge + vitest).
import {
  describeBillingSubscription,
  type BillingSubscriptionRow,
} from '../../supabase/functions/_shared/billing-display';

// Owner P1 user-shoes regression guard (2026-07-10): the Billing modal must
// never render a raw subscription UUID or an empty "Current Period —".

const UUID = '2119b0c1-c3b5-4c28-9db0-6924ba19abf4';

const base: BillingSubscriptionRow = {
  id: UUID,
  tier: 'pro',
  status: 'active',
  current_period_end: '2026-08-10T00:00:00Z',
  trial_end: null,
};

describe('describeBillingSubscription (no raw IDs in UI)', () => {
  it('labels the item with the humanized plan, never the UUID', () => {
    const { item } = describeBillingSubscription(base);
    expect(item.label).toBe('Pro Plan');
    expect(item.label).not.toContain(UUID);
    expect(item.id).toBe(UUID); // internal key preserved for actions
    expect(item.status).toBe('active');
    expect(item.detail).toMatch(/^Renews /);
  });

  it('emits Plan and Next Invoice stats consumed by BillingModule', () => {
    const { stats } = describeBillingSubscription(base);
    expect(stats.find((s) => s.label === 'Plan')?.value).toBe('Pro Plan');
    expect(stats.find((s) => s.label === 'Next Invoice')?.value).toBeTruthy();
  });

  it('prefers trial messaging while trialing', () => {
    const { item } = describeBillingSubscription({
      ...base,
      status: 'trialing',
      trial_end: '2026-07-20T00:00:00Z',
    });
    expect(item.detail).toMatch(/^Trial ends /);
  });

  it('is null-safe: missing tier/status/dates still yields honest copy', () => {
    const { item, stats } = describeBillingSubscription({
      id: UUID,
      tier: null,
      status: null,
      current_period_end: null,
      trial_end: null,
    });
    expect(item.label).toBe('Subscription');
    expect(item.label).not.toContain(UUID);
    expect(item.status).toBe('active');
    expect(item.detail).toBeUndefined();
    expect(stats.find((s) => s.label === 'Plan')?.value).toBe('Subscription');
    expect(stats.find((s) => s.label === 'Next Invoice')).toBeUndefined();
  });

  it('normalizes multi-word tiers without leaking snake_case', () => {
    const { item } = describeBillingSubscription({ ...base, tier: 'apex_enterprise' });
    expect(item.label).toBe('Apex Enterprise Plan');
  });
});
