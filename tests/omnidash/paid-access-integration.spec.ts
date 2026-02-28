/**
 * PATCH 2: Paid Access Integration Tests
 *
 * Tests OmniDash accessibility for ALL paid users (not just admins)
 *
 * EXPECTED BEHAVIOR (after fix):
 * - Starter/Pro/Enterprise tier users can access OmniDash
 * - Free tier users see upgrade prompt
 * - RLS policies allow is_admin() OR is_paid_user()
 * - OmniDashLayout checks isPaid OR isAdmin
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hasServiceKey,
  OmniDashTestContext,
  setupTestUser,
  cleanupTestUser,
  subscriptionDates,
} from './_test-helpers';

const describeIf = hasServiceKey ? describe : describe.skip;

describeIf('Paid Access Integration with OmniDash', () => {
  let ctx: OmniDashTestContext;

  beforeEach(async () => {
    ctx = await setupTestUser('paid-access-test');
  });

  afterEach(async () => {
    await cleanupTestUser(ctx.adminClient, ctx.testUserId, async (client, userId) => {
      await client.from('subscriptions').delete().eq('user_id', userId);
      await client.from('omnidash_settings').delete().eq('user_id', userId);
    });
  });

  // Helper to insert subscription
  const insertSubscription = (tier: string, status: string, dates?: Record<string, string>) =>
    ctx.adminClient.from('subscriptions').insert({ user_id: ctx.testUserId, tier, status, ...dates });

  // Helper to query omnidash_settings
  const querySettings = () =>
    ctx.anonClient.from('omnidash_settings').select('*').eq('user_id', ctx.testUserId).maybeSingle();

  describe('RLS Policies - omnidash_settings table', () => {
    it.each([
      { tier: 'starter', status: 'active', dates: subscriptionDates.active30Days() },
      { tier: 'pro', status: 'active', dates: subscriptionDates.active30Days() },
      { tier: 'enterprise', status: 'active', dates: subscriptionDates.active365Days() },
      { tier: 'pro', status: 'trialing', dates: subscriptionDates.trialing14Days() },
      { tier: 'pro', status: 'canceled', dates: subscriptionDates.canceledMidPeriod() },
    ])('should allow $tier tier user with $status status to query omnidash_settings', async ({ tier, status, dates }) => {
      await insertSubscription(tier, status, dates);
      const { error } = await querySettings();
      expect(error).toBeNull();
    });

    it('should DENY free tier user access to omnidash_settings', async () => {
      await insertSubscription('free', 'active');
      const { error } = await querySettings();
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/policy|permission/i);
    });

    it('should DENY user with expired subscription', async () => {
      await insertSubscription('pro', 'expired', subscriptionDates.expired());
      const { error } = await querySettings();
      expect(error).not.toBeNull();
    });
  });

  describe('RLS Policies - other OmniDash tables', () => {
    const tables = ['omnidash_today_items', 'omnidash_pipeline_items', 'omnidash_kpi_daily', 'omnidash_incidents'] as const;
    type OmniDashTable = typeof tables[number];

    const queryTable = (table: OmniDashTable) =>
      ctx.anonClient.from(table).select('*').eq('user_id', ctx.testUserId);

    it.each(tables)('should allow paid user to access %s', async (table) => {
      await insertSubscription('starter', 'active', subscriptionDates.active30Days());
      const { error } = await queryTable(table);
      expect(error).toBeNull();
    });

    it.each(tables)('should DENY free user access to %s', async (table) => {
      await insertSubscription('free', 'active');
      const { error } = await queryTable(table);
      expect(error).not.toBeNull();
    });
  });

  describe('Admins maintain access (backward compatibility)', () => {
    it('should allow admin user even with free tier', async () => {
      await ctx.adminClient.from('user_roles').insert({ user_id: ctx.testUserId, role: 'admin' });
      await ctx.adminClient.from('subscriptions').upsert({ user_id: ctx.testUserId, tier: 'free', status: 'active' });
      const { error } = await querySettings();
      expect(error).toBeNull();
    });
  });

  describe('Integration: End-to-end paid access flow', () => {
    it('should grant full OmniDash access to paid user', async () => {
      await insertSubscription('pro', 'active', subscriptionDates.active30Days());

      const { data: isPaid } = await ctx.adminClient.rpc('is_paid_user', { _user_id: ctx.testUserId });
      expect(isPaid).toBe(true);

      const { error: insertError } = await ctx.anonClient.from('omnidash_settings').insert({
        user_id: ctx.testUserId,
        demo_mode: false,
        show_connected_ecosystem: true,
        anonymize_kpis: false,
        freeze_mode: false,
      });
      expect(insertError).toBeNull();

      const { data: settings, error: selectError } = await ctx.anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', ctx.testUserId)
        .single();

      expect(selectError).toBeNull();
      expect(settings).toBeDefined();
      expect(settings?.demo_mode).toBe(false);
    });
  });
});
