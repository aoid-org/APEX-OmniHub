import type { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * APEX-OmniHub E2E Global Teardown
 *
 * Cleans up the dynamically provisioned test user created by global-setup.ts.
 * Requires E2E_SUPABASE_SERVICE_ROLE_KEY (same as setup). If the key is absent
 * or cleanup fails, logs a warning but does not throw — a failed cleanup should
 * never block a CI run.
 */
async function globalTeardown(_config: FullConfig) {
  const backendRequired =
    process.env.APEX_E2E_BACKEND_REQUIRED === 'true' ||
    process.env.REQUIRE_SUPABASE_E2E === 'true';

  if (!backendRequired) return;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.log('APEX E2E teardown: no service role key — skipping test user cleanup.');
    return;
  }

  let email: string | undefined;
  try {
    const credsPath = path.resolve(process.cwd(), 'playwright', '.auth', 'e2e-test-user.json');
    const raw = fs.readFileSync(credsPath, 'utf-8');
    const creds = JSON.parse(raw) as { email?: string };
    email = creds.email;
  } catch {
    console.log('APEX E2E teardown: no credentials file — nothing to clean up.');
    return;
  }

  if (!email) {
    console.log('APEX E2E teardown: no email in credentials file — nothing to clean up.');
    return;
  }

  try {
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = data?.users?.find((u) => u.email === email);

    if (testUser) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(testUser.id);
      if (error) {
        console.warn(`APEX E2E teardown: failed to delete test user ${email}: ${error.message}`);
      } else {
        console.log(`✓ APEX E2E teardown: deleted test user ${email}`);
      }
    } else {
      console.log(`APEX E2E teardown: test user ${email} not found (may already be cleaned up).`);
    }

    // Clean up the credentials file
    const credsPath = path.resolve(process.cwd(), 'playwright', '.auth', 'e2e-test-user.json');
    try {
      fs.unlinkSync(credsPath);
    } catch {
      // File already gone
    }
  } catch (error) {
    console.warn(
      `APEX E2E teardown: cleanup failed (non-blocking): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export default globalTeardown;
