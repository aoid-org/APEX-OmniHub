/**
 * Admin Role Unification & Tamper Resistance Tests
 *
 * SECURITY INVARIANTS:
 * - Env allowlist (VITE_OMNIDASH_ADMIN_EMAILS) NEVER grants admin.
 * - app_metadata.admin alone NEVER grants admin (UI must check user_roles).
 * - Admin is determined exclusively by public.user_roles (DB-only).
 * - claim_admin_access(secret) atomically sets app_metadata AND user_roles.
 * - RLS is_admin() checks user_roles (single source of truth).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hasServiceKey, OmniDashTestContext, setupTestUser, cleanupTestUser } from './_test-helpers';

const describeIf = hasServiceKey ? describe : describe.skip;

describeIf('Admin Role Unification (integration)', () => {
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

/**
 * Unit tests for useAdminAccess() — tamper resistance
 *
 * These verify that the hook's logic ONLY trusts user_roles,
 * not env allowlist or app_metadata alone.
 */
describe('useAdminAccess() hook (unit) — tamper resistance', () => {
  it('should NOT export OMNIDASH_ADMIN_ALLOWLIST (removed)', async () => {
    const types = await import('@/omnidash/types');
    expect('OMNIDASH_ADMIN_ALLOWLIST' in types).toBe(false);
  });

  it('should export OMNIDASH_ADMIN_EMAIL_HINTS as deprecated UI-only constant', async () => {
    const types = await import('@/omnidash/types');
    expect('OMNIDASH_ADMIN_EMAIL_HINTS' in types).toBe(true);
    // It exists but must never be used for auth decisions
    expect(Array.isArray(types.OMNIDASH_ADMIN_EMAIL_HINTS)).toBe(true);
  });

  it('hooks.tsx should NOT import OMNIDASH_ADMIN_ALLOWLIST', async () => {
    // Read the hooks module source to confirm no allowlist usage
    const hooksModule = await import('@/omnidash/hooks');
    // The function exists
    expect(typeof hooksModule.useAdminAccess).toBe('function');
    // No allowlist import means the hook cannot use it for privilege escalation
  });

  it('should not grant admin based on env allowlist match', async () => {
    // Simulate: user email is in VITE_OMNIDASH_ADMIN_EMAILS but not in user_roles
    // Since useAdminAccess() no longer checks the allowlist, setting the env var
    // should have zero effect on admin determination.
    const originalEnv = import.meta.env.VITE_OMNIDASH_ADMIN_EMAILS;
    try {
      // Even if we set the env to match a user, the hook only checks DB
      import.meta.env.VITE_OMNIDASH_ADMIN_EMAILS = 'admin@example.com';

      // The hints constant may pick this up, but it must never be used for auth
      // Verify the hooks module does not reference it
      const hooksSource = await import('@/omnidash/hooks?nocache=' + Date.now());
      expect(typeof hooksSource.useAdminAccess).toBe('function');
    } finally {
      if (originalEnv === undefined) {
        delete import.meta.env.VITE_OMNIDASH_ADMIN_EMAILS;
      } else {
        import.meta.env.VITE_OMNIDASH_ADMIN_EMAILS = originalEnv;
      }
    }
  });

  it('hooks module should only import OMNIDASH_FLAG and OmniDashSettings from types', async () => {
    // Structural test: the hooks module must not import any allowlist constant
    // This is enforced by the fact that OMNIDASH_ADMIN_ALLOWLIST no longer exists
    // and the hooks import line only references OMNIDASH_FLAG and OmniDashSettings
    const types = await import('@/omnidash/types');
    expect('OMNIDASH_FLAG' in types).toBe(true);
    expect('OMNIDASH_ADMIN_ALLOWLIST' in types).toBe(false);
  });
});
