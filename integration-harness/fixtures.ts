import { test as base, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (k: string, fallback = '') => process.env[k]?.trim() || fallback;
const required = (k: string) => {
  const value = env(k);
  if (!value) throw new Error(`Missing required env: ${k}`);
  return value;
};

type Fx = {
  omnihubUrl: string;
  sbblUrl: string;
  omniPage: Page;
  sbblPage: Page;
  sbblAdmin: SupabaseClient;
  sbblFan: SupabaseClient;
  adminToken: string;
  fanToken: string;
};

const supabaseUrl = () => env('SBBL_SUPABASE_URL');
const supabaseAnon = () => env('SBBL_SUPABASE_ANON_KEY');
const supabaseSvc = () => env('SBBL_SUPABASE_SERVICE_KEY');

async function signInToken(emailKey: string, passKey: string): Promise<string> {
  const client = createClient(required('SBBL_SUPABASE_URL'), required('SBBL_SUPABASE_ANON_KEY'));
  const { data, error } = await client.auth.signInWithPassword({ email: required(emailKey), password: required(passKey) });
  if (error || !data.session?.access_token) throw new Error(`Auth failed for ${emailKey}: ${error?.message ?? 'no token'}`);
  return data.session.access_token;
}

export const test = base.extend<Fx>({
  omnihubUrl: async ({}, use) => use(env('OMNIHUB_URL', env('OMNIHUB_BASE_URL', 'http://localhost:5173'))),
  sbblUrl: async ({}, use) => use(env('SBBL_URL', env('SBBL_BASE_URL', 'http://localhost:8787'))),
  omniPage: async ({ browser }, use) => { const p = await browser.newPage(); await use(p); await p.close(); },
  sbblPage: async ({ browser }, use) => { const p = await browser.newPage(); await use(p); await p.close(); },
  sbblAdmin: async ({}, use) => {
    const key = supabaseSvc() || supabaseAnon();
    if (!supabaseUrl() || !key) test.skip(true, 'Missing Supabase admin env');
    await use(createClient(required('SBBL_SUPABASE_URL'), key));
  },
  sbblFan: async ({ fanToken }, use) => {
    if (!supabaseUrl() || !supabaseAnon()) test.skip(true, 'Missing Supabase anon env');
    await use(createClient(required('SBBL_SUPABASE_URL'), required('SBBL_SUPABASE_ANON_KEY'), { global: { headers: { Authorization: `Bearer ${fanToken}` } } }));
  },
  adminToken: async ({}, use) => {
    if (!env('INTEGRATION_ADMIN_EMAIL') || !env('INTEGRATION_ADMIN_PASSWORD')) test.skip(true, 'Missing admin creds');
    await use(await signInToken('INTEGRATION_ADMIN_EMAIL', 'INTEGRATION_ADMIN_PASSWORD'));
  },
  fanToken: async ({}, use) => {
    if (!env('INTEGRATION_FAN_EMAIL') || !env('INTEGRATION_FAN_PASSWORD')) test.skip(true, 'Missing fan creds');
    await use(await signInToken('INTEGRATION_FAN_EMAIL', 'INTEGRATION_FAN_PASSWORD'));
  },
});

export { expect };
