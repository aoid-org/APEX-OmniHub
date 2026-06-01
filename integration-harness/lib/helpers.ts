import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const env = (k: string) => process.env[k]?.trim() ?? '';
export const envAny = (keys: string[]) => keys.map((k) => env(k)).find(Boolean) ?? '';
export const req = (keys: string[]) => {
  const missing = keys.filter((k) => !env(k));
  test.skip(missing.length > 0, `Missing env: ${missing.join(', ')}`);
};

export const sbblUser = (accessToken: string) => createClient(
  envAny(['SBBL_SUPABASE_URL', 'SUPABASE_URL']),
  envAny(['SBBL_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']),
  { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
);

export async function assertNoConsoleErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.waitForTimeout(1000);
  expect(errors, `Console errors: ${errors.join(' | ')}`).toEqual([]);
}
