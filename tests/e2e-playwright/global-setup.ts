import type { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * APEX-OmniHub: Test Integrity Doctrine (R4 Backend Realism)
 * 
 * Ensures tests are run against a real, reachable backend.
 * BANS mock/placeholder Supabase environments.
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
    // Supabase standard healthcheck endpoint
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

    // Seed test user dynamically since anonymous sign-ins are disabled
    const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && !process.env.E2E_USER_EMAIL) {
      const supabaseAdmin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const email = `test-runner-${Date.now()}@apex-omnihub.local`;
      const password = `Test-Pass-123!`;
      
      console.log(`Provisioning dynamic test user: ${email}`);
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) {
        console.warn(`Failed to provision test user: ${error.message}`);
      } else {
        process.env.E2E_USER_EMAIL = email;
        process.env.E2E_USER_PASSWORD = password;
      }
    }
  } catch (error) {
    throw new Error(`APEX-1203: Test Integrity Doctrine R4 Violation - Backend unreachable at ${url}. ${error instanceof Error ? error.message : ''}`);
  }
}

export default globalSetup;
