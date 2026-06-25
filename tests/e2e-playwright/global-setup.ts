import type { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * APEX-OmniHub: Test Integrity Doctrine (R4 Backend Realism)
 *
 * Ensures tests are run against a real, reachable backend.
 * BANS mock/placeholder Supabase environments.
 *
 * APEX-1205: Playwright workers are separate OS processes. process.env mutations
 * made here are NOT inherited by workers. Credentials are written to
 * playwright/.auth/e2e-test-user.json so helpers/auth.ts can read them.
 */
async function globalSetup(_config: FullConfig) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('APEX-1200: Test Integrity Doctrine R4 Violation - Supabase URL and Key are required. No offline mocks permitted.');
  }

  if (url.includes('placeholder') || url.includes('example') || url === 'https://test.supabase.co') {
    throw new Error(`APEX-1201: Test Integrity Doctrine R4 Violation - Real backend required. Mocked URL detected: ${url}`);
  }

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (!response.ok) {
      throw new Error(`APEX-1202: Backend healthcheck failed (${response.status} ${response.statusText})`);
    }

    const data = await response.json();
    if (data.version === undefined && data.name !== 'GoTrue') {
      console.warn('Warning: Healthcheck responded, but does not look like Supabase Auth API');
    }

    const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const supabaseAdmin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const email = `test-runner-${Date.now()}@apex-omnihub.local`;
      const password = 'Test-Pass-123!';

      console.log(`Provisioning dynamic test user: ${email}`);
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) {
        // APEX-1204: Throw hard — silent failure leaves no creds file, causing ALL
        // authenticated tests to fail with a misleading "Invalid login credentials" error.
        // NOTE: Throw BEFORE the outer catch so we surface APEX-1204, not APEX-1203.
        const provisioningError = new Error(
          `APEX-1204: E2E user provisioning failed — authenticated tests require a valid test user. Error: ${error.message}`
        );
        // eslint-disable-next-line no-console
        console.error(provisioningError.message);
        throw provisioningError;
      }

      // APEX-1205: Write to file — workers read this since they cannot inherit
      // process.env changes made in globalSetup (separate OS processes).
      const authDir = path.resolve(process.cwd(), 'playwright', '.auth');
      fs.mkdirSync(authDir, { recursive: true });
      fs.writeFileSync(
        path.join(authDir, 'e2e-test-user.json'),
        JSON.stringify({ email, password }),
        'utf-8'
      );

      process.env.E2E_USER_EMAIL = email;
      process.env.E2E_USER_PASSWORD = password;
      console.log(`✓ Provisioned dynamic test user: ${email}`);
    }
  } catch (error) {
    // Re-throw provisioning errors (APEX-1204) as-is so they aren't masked as APEX-1203.
    if (error instanceof Error && error.message.startsWith('APEX-1204')) {
      throw error;
    }
    throw new Error(`APEX-1203: Test Integrity Doctrine R4 Violation - Backend unreachable at ${url}. ${error instanceof Error ? error.message : ''}`);
  }
}

export default globalSetup;
