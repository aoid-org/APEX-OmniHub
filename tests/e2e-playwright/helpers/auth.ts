import { expect, type Page } from '@playwright/test';
import { createClient, type Session } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

type SupabaseBrowserConfig = {
  readonly url: string;
  readonly key: string;
};

function getSupabaseBrowserConfig(): SupabaseBrowserConfig | null {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  return url && key ? { url, key } : null;
}

function getSupabaseStorageKey(url: string): string {
  const projectRef = new URL(url).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

/**
 * APEX-1205: Resolve E2E credentials in priority order:
 *   1. File written by globalSetup (playwright/.auth/e2e-test-user.json) — highest priority.
 *      Playwright workers are separate OS processes and do NOT inherit process.env
 *      mutations made in globalSetup, so the dynamically provisioned user must be
 *      communicated via file.
 *   2. Process env vars (E2E_USER_EMAIL / E2E_USER_PASSWORD) — static CI secrets fallback.
 *   3. Neither available → returns undefined/undefined → falls through to anonymous sign-in
 *      (which will fail loudly if anonymous auth is disabled, as intended).
 */
function resolveE2ECredentials(): { email: string | undefined; password: string | undefined } {
  // Priority 1: dynamic credentials file written by globalSetup
  try {
    const credsPath = path.resolve(process.cwd(), 'playwright', '.auth', 'e2e-test-user.json');
    const raw = fs.readFileSync(credsPath, 'utf-8');
    const creds = JSON.parse(raw) as { email?: string; password?: string };
    if (creds.email && creds.password) {
      return { email: creds.email, password: creds.password };
    }
  } catch {
    // File absent — no dynamic user was provisioned (e.g., no service role key in this run)
  }

  // Priority 2: static CI secrets / local .env
  const envEmail = process.env.E2E_USER_EMAIL;
  const envPassword = process.env.E2E_USER_PASSWORD;
  if (envEmail && envPassword) {
    return { email: envEmail, password: envPassword };
  }

  return { email: undefined, password: undefined };
}

async function createRealSupabaseSession(config: SupabaseBrowserConfig): Promise<Session> {
  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { email, password } = resolveE2ECredentials();
  const response = email && password
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signInAnonymously();

  if (response.error || !response.data.session) {
    throw new Error(
      `Unable to create real Supabase E2E session: ${response.error?.message ?? 'missing session'}`,
    );
  }

  return response.data.session;
}

export function skipWithoutSupabaseConfig(): void {
  // Setup guarantees backend; no skips allowed.
}

export async function signInWithSupabaseSession(page: Page): Promise<void> {
  const config = getSupabaseBrowserConfig();
  if (!config) {
    throw new Error('Missing Supabase URL or browser-safe anon/publishable key for authenticated E2E flow.');
  }

  const session = await createRealSupabaseSession(config);

  const storageKey = getSupabaseStorageKey(config.url);

  await page.addInitScript(
    ({ key, value }: { key: string; value: Session }) => {
      // Match supabase-js browser persistence so the app authenticates normally on first load.
      globalThis.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: storageKey, value: session },
  );

  await page.goto('/omnidash', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/omnidash/, { timeout: 30_000 });
}
