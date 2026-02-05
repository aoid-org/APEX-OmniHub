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
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const runTests = !!SUPABASE_SERVICE_KEY;
const describeIf = runTests ? describe : describe.skip;

describeIf('Paid Access Integration with OmniDash', () => {
  let adminClient: ReturnType<typeof createClient<Database>>;
  let testUserId: string;
  let testUserEmail: string;
  let anonClient: ReturnType<typeof createClient<Database>>;

  beforeEach(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    testUserEmail = `test-${Date.now()}@paid-access-test.local`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: 'test-password-123456',
      email_confirm: true,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to create test user');

    testUserId = data.user.id;

    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    anonClient = createClient<Database>(SUPABASE_URL, anonKey, {
      auth: { persistSession: false },
    });

    await anonClient.auth.signInWithPassword({
      email: testUserEmail,
      password: 'test-password-123456',
    });
  });

  afterEach(async () => {
    if (testUserId) {
      await adminClient.from('subscriptions').delete().eq('user_id', testUserId);
      await adminClient.from('omnidash_settings').delete().eq('user_id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  describe('RLS Policies - omnidash_settings table', () => {
    it('should allow starter tier user to query omnidash_settings', async () => {
      // RED TEST: Currently only admins can access

      // Grant starter subscription
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'starter',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Try to query omnidash_settings
      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(error).toBeNull(); // FAILS: RLS denies access
      // Data may be null if no settings yet, but no RLS error
    });

    it('should allow pro tier user to query omnidash_settings', async () => {
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'pro',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(error).toBeNull();
    });

    it('should allow enterprise tier user to query omnidash_settings', async () => {
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'enterprise',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(error).toBeNull();
    });

    it('should DENY free tier user access to omnidash_settings', async () => {
      // User has free tier subscription (default)
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'free',
        status: 'active',
      });

      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      // Should get RLS error
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/policy|permission/i);
    });

    it('should allow paid user with trialing status', async () => {
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'pro',
        status: 'trialing',
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(error).toBeNull();
    });

    it('should allow paid user with canceled status (within period)', async () => {
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'pro',
        status: 'canceled',
        current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        canceled_at: new Date().toISOString(),
      });

      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(error).toBeNull();
    });

    it('should DENY user with expired subscription', async () => {
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'pro',
        status: 'expired',
        current_period_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(error).not.toBeNull();
    });
  });

  describe('RLS Policies - other OmniDash tables', () => {
    const tables = [
      'omnidash_today_items',
      'omnidash_pipeline_items',
      'omnidash_kpi_daily',
      'omnidash_incidents',
    ];

    tables.forEach((table) => {
      it(`should allow paid user to access ${table}`, async () => {
        await adminClient.from('subscriptions').insert({
          user_id: testUserId,
          tier: 'starter',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        const { error } = await anonClient
          .from(table as 'omnidash_today_items' | 'omnidash_pipeline_items' | 'omnidash_kpi_daily' | 'omnidash_incidents')
          .select('*')
          .eq('user_id', testUserId);

        expect(error).toBeNull();
      });

      it(`should DENY free user access to ${table}`, async () => {
        await adminClient.from('subscriptions').insert({
          user_id: testUserId,
          tier: 'free',
          status: 'active',
        });

        const { error } = await anonClient
          .from(table as 'omnidash_today_items' | 'omnidash_pipeline_items' | 'omnidash_kpi_daily' | 'omnidash_incidents')
          .select('*')
          .eq('user_id', testUserId);

        expect(error).not.toBeNull();
      });
    });
  });

  describe('Admins maintain access (backward compatibility)', () => {
    it('should allow admin user even with free tier', async () => {
      // Grant admin role
      await adminClient.from('user_roles').insert({
        user_id: testUserId,
        role: 'admin',
      });

      // Keep free tier
      await adminClient.from('subscriptions').upsert({
        user_id: testUserId,
        tier: 'free',
        status: 'active',
      });

      // Admin should still have access
      const { error } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(error).toBeNull();
    });
  });

  describe('Integration: End-to-end paid access flow', () => {
    it('should grant full OmniDash access to paid user', async () => {
      // Create subscription
      await adminClient.from('subscriptions').insert({
        user_id: testUserId,
        tier: 'pro',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Verify is_paid_user() returns true
      const { data: isPaid } = await adminClient.rpc('is_paid_user', { _user_id: testUserId });
      expect(isPaid).toBe(true);

      // Verify can create omnidash_settings
      const { error: insertError } = await anonClient
        .from('omnidash_settings')
        .insert({
          user_id: testUserId,
          demo_mode: false,
          show_connected_ecosystem: true,
          anonymize_kpis: false,
          freeze_mode: false,
        });

      expect(insertError).toBeNull();

      // Verify can query omnidash_settings
      const { data: settings, error: selectError } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(selectError).toBeNull();
      expect(settings).toBeDefined();
      expect(settings?.demo_mode).toBe(false);
    });
  });
});
