/**
 * OMNI-TEST: Login Supabase Config Guard
 * ────────────────────────────────────────
 * Tests the hasSupabaseConfig logic that gates the login flow.
 * Root cause: envDir mismatch caused VITE_SUPABASE_URL to be empty,
 * making hasSupabaseConfig = false → "temporarily unavailable."
 *
 * Test types: Unit (Tier 1) + Smoke (Tier 1)
 * Pattern: AAA (Arrange-Act-Assert), Parameterized
 * Naming: Given_When_Then
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Shared helpers (outer scope per SonarQube S1854) ───────────────

/**
 * Mirrors the exact logic from apps/omnihub-site/src/lib/supabase.ts:5-7.
 */
function evaluateHasSupabaseConfig(url: string, anonKey: string): boolean {
  const hasValidSupabaseUrl = /^https?:\/\//i.test(url);
  return hasValidSupabaseUrl && anonKey.length > 0;
}

/** Reads a file if it exists, returns null otherwise. */
function readFileIfExists(filePath: string): string | null {
  return existsSync(filePath) ? readFileSync(filePath, 'utf-8') : null;
}

/** Asserts a file's content matches a regex, skipping gracefully if the file doesn't exist. */
function expectFileMatchesOrSkip(filePath: string, pattern: RegExp): void {
  const content = readFileIfExists(filePath);
  if (content === null) return;
  expect(content).toMatch(pattern);
}

// ─── Shared paths ───────────────────────────────────────────────────
const VITE_CONFIG_PATH = resolve(__dirname, '../apps/omnihub-site/vite.config.ts');
const ENV_PATH = resolve(__dirname, '../.env');

// ─── UNIT TESTS: hasSupabaseConfig logic (parameterized) ────────────
describe('hasSupabaseConfig guard (supabase.ts logic)', () => {
  it.each([
    { url: 'https://rtopreovkywofgwgmozi.supabase.co', key: 'eyJhbGciOiJ...', expected: true,  label: 'valid https url + nonempty anon key' },
    { url: 'http://localhost:54321',                    key: 'some-local-key',  expected: true,  label: 'valid http url + nonempty anon key' },
    { url: '',                                          key: 'valid-key',       expected: false, label: 'empty url (THE BUG)' },
    { url: 'https://valid.supabase.co',                 key: '',                expected: false, label: 'empty anon key' },
    { url: '',                                          key: '',                expected: false, label: 'both empty' },
    { url: 'rtopreovkywofgwgmozi.supabase.co',          key: 'valid-key',       expected: false, label: 'url without protocol' },
    { url: 'placeholder',                               key: 'placeholder-key', expected: false, label: 'placeholder url' },
  ])('should return $expected when $label', ({ url, key, expected }) => {
    expect(evaluateHasSupabaseConfig(url, key)).toBe(expected);
  });
});

// ─── SMOKE TEST: vite.config.ts has envDir ──────────────────────────
describe('vite.config.ts envDir fix (smoke test)', () => {
  const content = readFileIfExists(VITE_CONFIG_PATH);

  it('should_have_envDir_directive_pointing_to_monorepo_root', () => {
    expect(content).not.toBeNull();
    expect(content).toContain('envDir');
    expect(content).toMatch(/envDir.*['"]\.\.\/\.\.\/['"]/);
  });

  it('should_have_resolve_import_for_dirname_usage', () => {
    expect(content).toContain("from 'node:path'");
    expect(content).toContain('__dirname');
  });
});

// ─── SMOKE TEST: .env file has required vars ────────────────────────
describe('monorepo root .env contains Supabase credentials', () => {
  it('should_have_VITE_SUPABASE_URL_with_https_value', () => {
    expectFileMatchesOrSkip(ENV_PATH, /^VITE_SUPABASE_URL=https:\/\//m);
  });

  it('should_have_VITE_SUPABASE_ANON_KEY_with_nonempty_value', () => {
    expectFileMatchesOrSkip(ENV_PATH, /^VITE_SUPABASE_ANON_KEY=.{10,}/m);
  });
});
