import { test as base, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (k: string, fallback = '') => process.env[k]?.trim() || fallback;
const envAny = (keys: string[], fallback = '') => keys.map((k) => env(k)).find(Boolean) || fallback;
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

const supabaseUrl = () => envAny(['SBBL_SUPABASE_URL', 'SUPABASE_URL']);
const supabaseAnon = () => envAny(['SBBL_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);
const supabaseSvc = () => envAny(['SBBL_SUPABASE_SERVICE_KEY', 'SBBL_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY']);

async function signInToken(emailKey: string, passKey: string): Promise<string> {
  const client = createClient(supabaseUrl(), supabaseAnon());
  const { data, error } = await client.auth.signInWithPassword({ email: required(emailKey), password: required(passKey) });
  if (error || !data.session?.access_token) throw new Error(`Auth failed for ${emailKey}: ${error?.message ?? 'no token'}`);
  return data.session.access_token;
}

export const test = base.extend<Fx>({
  omnihubUrl: async (_args, runFixture) => runFixture(env('OMNIHUB_URL', env('OMNIHUB_BASE_URL', 'http://localhost:5173'))),
  sbblUrl: async (_args, runFixture) => runFixture(env('SBBL_URL', env('SBBL_BASE_URL', 'http://localhost:8787'))),
  omniPage: async ({ browser }, runFixture) => { const p = await browser.newPage(); await runFixture(p); await p.close(); },
  sbblPage: async ({ browser }, runFixture) => { const p = await browser.newPage(); await runFixture(p); await p.close(); },
  sbblAdmin: async (_args, runFixture) => {
    const key = supabaseSvc() || supabaseAnon();
    if (!supabaseUrl() || !key) test.skip(true, 'Missing Supabase admin env');
    await runFixture(createClient(supabaseUrl(), key));
  },
  sbblFan: async ({ fanToken }, runFixture) => {
    if (!supabaseUrl() || !supabaseAnon()) test.skip(true, 'Missing Supabase anon env');
    await runFixture(createClient(supabaseUrl(), supabaseAnon(), { global: { headers: { Authorization: `Bearer ${fanToken}` } } }));
  },
  adminToken: async (_args, runFixture) => {
    if (!env('INTEGRATION_ADMIN_EMAIL') || !env('INTEGRATION_ADMIN_PASSWORD')) test.skip(true, 'Missing admin creds');
    await runFixture(await signInToken('INTEGRATION_ADMIN_EMAIL', 'INTEGRATION_ADMIN_PASSWORD'));
  },
  fanToken: async (_args, runFixture) => {
    if (!env('INTEGRATION_FAN_EMAIL') || !env('INTEGRATION_FAN_PASSWORD')) test.skip(true, 'Missing fan creds');
    await runFixture(await signInToken('INTEGRATION_FAN_EMAIL', 'INTEGRATION_FAN_PASSWORD'));
  },
});
