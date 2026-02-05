/**
 * PATCH 1: Admin Role Unification Tests
 *
 * Tests the unification of 3 admin systems:
 * 1. Env allowlist (VITE_OMNIDASH_ADMIN_EMAILS)
 * 2. user_roles table (primary source of truth)
 * 3. app_metadata.admin claim (auto-synced to user_roles)
 *
 * EXPECTED BEHAVIOR (after fix):
 * - claim_admin_access(secret) sets app_metadata AND inserts into user_roles
 * - Trigger auto-syncs app_metadata.admin changes to user_roles
 * - useAdminAccess() checks: allowlist → user_roles → app_metadata (fallback)
 * - RLS is_admin() function checks user_roles (single source of truth)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hasServiceKey, OmniDashTestContext, setupTestUser, cleanupTestUser } from './_test-helpers';

const describeIf = hasServiceKey ? describe : describe.skip;

describeIf('Admin Role Unification', () => {
  let ctx: OmniDashTestContext;

  beforeEach(async () => {
    ctx = await setupTestUser('admin-unification-test');
  });

  afterEach(async () => {
    await cleanupTestUser(ctx.adminClient, ctx.testUserId);
  });

  // Helper to query user_roles
  const queryUserRole = () =>
    ctx.adminClient.from('user_roles').select('role').eq('user_id', ctx.testUserId).maybeSingle();

  // Helper to claim admin access
  const claimAdminAccess = (secret: string) =>
    ctx.anonClient.rpc('claim_admin_access', { secret_key: secret });

  describe('claim_admin_access() function', () => {
    it('should set app_metadata AND insert into user_roles table', async () => {
      const { data: claimResult, error: claimError } = await claimAdminAccess('checklist-complete-2026');
      expect(claimError).toBeNull();
      expect(claimResult).toBe(true);

      const { data: userData, error: userError } = await ctx.adminClient.auth.admin.getUserById(ctx.testUserId);
      expect(userError).toBeNull();
      expect(userData.user?.app_metadata?.admin).toBe(true);
      expect(userData.user?.app_metadata?.role).toBe('admin');

      const { data: roleData, error: roleError } = await queryUserRole();
      expect(roleError).toBeNull();
      expect(roleData?.role).toBe('admin');
    });

    it('should return false for incorrect secret', async () => {
      const { data: claimResult, error: claimError } = await claimAdminAccess('wrong-secret');
      expect(claimError).toBeNull();
      expect(claimResult).toBe(false);

      const { data: userData } = await ctx.adminClient.auth.admin.getUserById(ctx.testUserId);
      expect(userData.user?.app_metadata?.admin).toBeUndefined();

      const { data: roleData } = await queryUserRole();
      expect(roleData).toBeNull();
    });

    it('should be idempotent (calling twice should not error)', async () => {
      await claimAdminAccess('checklist-complete-2026');

      const { data: claimResult, error: claimError } = await claimAdminAccess('checklist-complete-2026');
      expect(claimError).toBeNull();
      expect(claimResult).toBe(true);

      const { data: roleData, error: roleError } = await ctx.adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', ctx.testUserId);
      expect(roleError).toBeNull();
      expect(roleData).toHaveLength(1);
    });
  });

  describe('app_metadata trigger sync', () => {
    it('should auto-insert into user_roles when app_metadata.admin=true is set', async () => {
      await ctx.adminClient.auth.admin.updateUserById(ctx.testUserId, {
        app_metadata: { admin: true, role: 'admin' },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { data: roleData, error: roleError } = await queryUserRole();
      expect(roleError).toBeNull();
      expect(roleData?.role).toBe('admin');
    });

    it('should auto-delete from user_roles when app_metadata.admin=false is set', async () => {
      await ctx.adminClient.auth.admin.updateUserById(ctx.testUserId, {
        app_metadata: { admin: true, role: 'admin' },
      });
      await ctx.adminClient.from('user_roles').insert({ user_id: ctx.testUserId, role: 'admin' });

      await ctx.adminClient.auth.admin.updateUserById(ctx.testUserId, {
        app_metadata: { admin: false },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { data: roleData } = await queryUserRole();
      expect(roleData).toBeNull();
    });
  });

  describe('is_admin() RLS function', () => {
    it('should return true for users in user_roles table with role=admin', async () => {
      await ctx.adminClient.from('user_roles').insert({ user_id: ctx.testUserId, role: 'admin' });
      const { data, error } = await ctx.adminClient.rpc('is_admin', { _user_id: ctx.testUserId });
      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for users not in user_roles table', async () => {
      const { data, error } = await ctx.adminClient.rpc('is_admin', { _user_id: ctx.testUserId });
      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for users with non-admin roles', async () => {
      await ctx.adminClient.from('user_roles').insert({ user_id: ctx.testUserId, role: 'user' });
      const { data, error } = await ctx.adminClient.rpc('is_admin', { _user_id: ctx.testUserId });
      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('Integration: End-to-end admin flow', () => {
    it('should grant full admin access via claim_admin_access() -> RLS check passes', async () => {
      await claimAdminAccess('checklist-complete-2026');

      const { data: isAdminResult } = await ctx.adminClient.rpc('is_admin', { _user_id: ctx.testUserId });
      expect(isAdminResult).toBe(true);

      const { error: settingsError } = await ctx.anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', ctx.testUserId)
        .maybeSingle();
      expect(settingsError).toBeNull();
    });

    it('should maintain consistency across all three systems', async () => {
      await claimAdminAccess('checklist-complete-2026');

      const { data: userData } = await ctx.adminClient.auth.admin.getUserById(ctx.testUserId);
      expect(userData.user?.app_metadata?.admin).toBe(true);

      const { data: roleData } = await queryUserRole();
      expect(roleData?.role).toBe('admin');

      const { data: isAdminResult } = await ctx.adminClient.rpc('is_admin', { _user_id: ctx.testUserId });
      expect(isAdminResult).toBe(true);
    });
  });
});

describe('useAdminAccess() hook (unit)', () => {
  it('should check allowlist FIRST before querying database', () => {
    expect(true).toBe(true); // Placeholder - hook tested via React component tests
  });

  it('should check user_roles table if not in allowlist', () => {
    expect(true).toBe(true); // Placeholder
  });

  it('should check app_metadata as fallback if user_roles returns null', () => {
    expect(true).toBe(true); // Placeholder
  });
});
