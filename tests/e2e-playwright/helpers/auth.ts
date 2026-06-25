import { expect, type Page } from '@playwright/test';
import { createClient, type Session } from '@supabase/supabase-js';

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

async function createRealSupabaseSession(config: SupabaseBrowserConfig): Promise<Session> {
  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
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
