/**
 * Shared test utilities for OmniDash integration tests
 * 
 * Consolidates common Supabase client setup, test user management,
 * and conditional test execution patterns.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment constants
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Placeholder / local-stack URL patterns that indicate no real Supabase project is reachable.
const PLACEHOLDER_URL_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'mock.supabase.co',
  'test.supabase.co',
  'placeholder.supabase.co',
];

const hasRealSupabaseUrl = !PLACEHOLDER_URL_PATTERNS.some((p) => SUPABASE_URL.includes(p));

// Conditional test execution — only enable if:
//   1. SUPABASE_SERVICE_ROLE_KEY looks like a valid JWT (starts with "eyJ"), AND
//   2. VITE_SUPABASE_URL points to a real (non-local/mock) Supabase project.
// Misformatted env vars or local-stack URLs correctly evaluate to false.
export const hasServiceKey =
  !!SUPABASE_SERVICE_KEY &&
  SUPABASE_SERVICE_KEY.startsWith('eyJ') &&
  hasRealSupabaseUrl;

/**
 * Test context containing clients and test user info
 */
export interface OmniDashTestContext {
  adminClient: SupabaseClient;
  anonClient: SupabaseClient;
  testUserId: string;
  testUserEmail: string;
}

/**
 * Creates a Supabase admin client (service role)
 */
export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Creates a Supabase anon client for test user
 */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Sets up a test user and returns the full test context
 * @param emailPrefix - Prefix for the test email domain
 */
export async function setupTestUser(emailPrefix: string): Promise<OmniDashTestContext> {
  const adminClient = createAdminClient();
  const testUserEmail = `test-${Date.now()}@${emailPrefix}.local`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email: testUserEmail,
    password: 'test-password-123456',
    email_confirm: true,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Failed to create test user');

  const testUserId = data.user.id;
  const anonClient = createAnonClient();

  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email: testUserEmail,
    password: 'test-password-123456',
  });

  if (signInError) throw signInError;

  return { adminClient, anonClient, testUserId, testUserEmail };
}

/**
 * Cleans up test user and related data
 */
export async function cleanupTestUser(
  adminClient: SupabaseClient,
  testUserId: string,
  additionalCleanup?: (client: SupabaseClient, userId: string) => Promise<void>
): Promise<void> {
  if (!testUserId) return;

  // Run any additional cleanup first
  if (additionalCleanup) {
    await additionalCleanup(adminClient, testUserId);
  }

  // Delete from user_roles
  await adminClient.from('user_roles').delete().eq('user_id', testUserId);

  // Delete user
  await adminClient.auth.admin.deleteUser(testUserId);
}

/**
 * Standard subscription period dates
 */
export const subscriptionDates = {
  active30Days: () => ({
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }),
  active365Days: () => ({
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }),
  trialing14Days: () => ({
    trial_start: new Date().toISOString(),
    trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  }),
  canceledMidPeriod: () => ({
    current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    canceled_at: new Date().toISOString(),
  }),
  expired: () => ({
    current_period_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    current_period_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  }),
};
