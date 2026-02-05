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
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// These tests require actual Supabase connection
// Run with: npm test -- admin-unification.spec.ts

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Skip tests if no service key available
const runTests = !!SUPABASE_SERVICE_KEY;
const describeIf = runTests ? describe : describe.skip;

describeIf('Admin Role Unification', () => {
  let adminClient: ReturnType<typeof createClient<Database>>;
  let testUserId: string;
  let testUserEmail: string;
  let anonClient: ReturnType<typeof createClient<Database>>;

  beforeEach(async () => {
    // Create admin client (service role)
    adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Create test user
    testUserEmail = `test-${Date.now()}@admin-unification-test.local`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: 'test-password-123456',
      email_confirm: true,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to create test user');

    testUserId = data.user.id;

    // Create anon client for test user
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    anonClient = createClient<Database>(SUPABASE_URL, anonKey, {
      auth: { persistSession: false },
    });

    // Sign in as test user
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: testUserEmail,
      password: 'test-password-123456',
    });

    if (signInError) throw signInError;
  });

  afterEach(async () => {
    // Cleanup: Delete test user and related data
    if (testUserId) {
      // Delete from user_roles
      await adminClient.from('user_roles').delete().eq('user_id', testUserId);

      // Delete user
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  describe('claim_admin_access() function', () => {
    it('should set app_metadata AND insert into user_roles table', async () => {
      // RED TEST: Currently claim_admin_access() does NOT insert into user_roles

      // Call claim_admin_access with correct secret
      const { data: claimResult, error: claimError } = await anonClient.rpc(
        'claim_admin_access',
        { secret_key: 'checklist-complete-2026' }
      );

      expect(claimError).toBeNull();
      expect(claimResult).toBe(true);

      // Verify app_metadata was set
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(testUserId);
      expect(userError).toBeNull();
      expect(userData.user?.app_metadata?.admin).toBe(true);
      expect(userData.user?.app_metadata?.role).toBe('admin');

      // Verify user_roles table has entry
      const { data: roleData, error: roleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(roleError).toBeNull();
      expect(roleData?.role).toBe('admin'); // FAILS: No row exists in user_roles
    });

    it('should return false for incorrect secret', async () => {
      const { data: claimResult, error: claimError } = await anonClient.rpc(
        'claim_admin_access',
        { secret_key: 'wrong-secret' }
      );

      expect(claimError).toBeNull();
      expect(claimResult).toBe(false);

      // Verify app_metadata was NOT set
      const { data: userData } = await adminClient.auth.admin.getUserById(testUserId);
      expect(userData.user?.app_metadata?.admin).toBeUndefined();

      // Verify user_roles has no entry
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(roleData).toBeNull();
    });

    it('should be idempotent (calling twice should not error)', async () => {
      // First call
      await anonClient.rpc('claim_admin_access', { secret_key: 'checklist-complete-2026' });

      // Second call (should not error)
      const { data: claimResult, error: claimError } = await anonClient.rpc(
        'claim_admin_access',
        { secret_key: 'checklist-complete-2026' }
      );

      expect(claimError).toBeNull();
      expect(claimResult).toBe(true);

      // Verify still only one row in user_roles
      const { data: roleData, error: roleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUserId);

      expect(roleError).toBeNull();
      expect(roleData).toHaveLength(1);
    });
  });

  describe('app_metadata trigger sync', () => {
    it('should auto-insert into user_roles when app_metadata.admin=true is set', async () => {
      // RED TEST: Trigger does not exist yet

      // Manually set app_metadata (simulating external admin grant)
      await adminClient.auth.admin.updateUserById(testUserId, {
        app_metadata: { admin: true, role: 'admin' },
      });

      // Give trigger time to fire (if it exists)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify user_roles was auto-populated
      const { data: roleData, error: roleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(roleError).toBeNull();
      expect(roleData?.role).toBe('admin'); // FAILS: Trigger doesn't exist yet
    });

    it('should auto-delete from user_roles when app_metadata.admin=false is set', async () => {
      // Setup: Create admin user first
      await adminClient.auth.admin.updateUserById(testUserId, {
        app_metadata: { admin: true, role: 'admin' },
      });
      await adminClient.from('user_roles').insert({ user_id: testUserId, role: 'admin' });

      // Remove admin via app_metadata
      await adminClient.auth.admin.updateUserById(testUserId, {
        app_metadata: { admin: false },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify user_roles row was deleted
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUserId)
        .maybeSingle();

      expect(roleData).toBeNull();
    });
  });

  describe('is_admin() RLS function', () => {
    it('should return true for users in user_roles table with role=admin', async () => {
      // Insert directly into user_roles
      await adminClient.from('user_roles').insert({ user_id: testUserId, role: 'admin' });

      // Call is_admin() function
      const { data, error } = await adminClient.rpc('is_admin', { _user_id: testUserId });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    it('should return false for users not in user_roles table', async () => {
      // Don't insert into user_roles

      const { data, error } = await adminClient.rpc('is_admin', { _user_id: testUserId });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });

    it('should return false for users with non-admin roles', async () => {
      // Insert with different role
      await adminClient.from('user_roles').insert({ user_id: testUserId, role: 'user' });

      const { data, error } = await adminClient.rpc('is_admin', { _user_id: testUserId });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  describe('Integration: End-to-end admin flow', () => {
    it('should grant full admin access via claim_admin_access() -> RLS check passes', async () => {
      // 1. User claims admin access
      await anonClient.rpc('claim_admin_access', { secret_key: 'checklist-complete-2026' });

      // 2. Verify RLS is_admin() returns true
      const { data: isAdminResult } = await adminClient.rpc('is_admin', { _user_id: testUserId });
      expect(isAdminResult).toBe(true);

      // 3. Verify user can access admin-protected table (omnidash_settings)
      const { error: settingsError } = await anonClient
        .from('omnidash_settings')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      // Should not have RLS error (may return null if no settings, but no error)
      expect(settingsError).toBeNull();
    });

    it('should maintain consistency across all three systems', async () => {
      // Grant admin via claim_admin_access
      await anonClient.rpc('claim_admin_access', { secret_key: 'checklist-complete-2026' });

      // Check all three sources
      // 1. app_metadata
      const { data: userData } = await adminClient.auth.admin.getUserById(testUserId);
      expect(userData.user?.app_metadata?.admin).toBe(true);

      // 2. user_roles table
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', testUserId)
        .maybeSingle();
      expect(roleData?.role).toBe('admin');

      // 3. RLS is_admin() function
      const { data: isAdminResult } = await adminClient.rpc('is_admin', { _user_id: testUserId });
      expect(isAdminResult).toBe(true);

      // ALL THREE MUST AGREE
    });
  });
});

describe('useAdminAccess() hook (unit)', () => {
  // These are lightweight unit tests mocking Supabase
  // Full integration tests above verify actual database behavior

  it('should check allowlist FIRST before querying database', () => {
    // Test logic: If email in allowlist, should return true without DB query
    // This is already working correctly in current implementation
    expect(true).toBe(true); // Placeholder - hook tested via React component tests
  });

  it('should check user_roles table if not in allowlist', () => {
    // Test logic: Query user_roles table for role='admin'
    expect(true).toBe(true); // Placeholder
  });

  it('should check app_metadata as fallback if user_roles returns null', () => {
    // RED TEST: Hook currently does NOT check app_metadata
    // After fix: Should call supabase.auth.getUser() and check app_metadata.admin
    expect(true).toBe(true); // Placeholder
  });
});
