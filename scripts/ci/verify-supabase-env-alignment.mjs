#!/usr/bin/env node
/**
 * verify-supabase-env-alignment.mjs
 *
 * Inventories Supabase project refs across all env contexts so misconfiguration
 * (e.g. an E2E job silently pointed at the dev or production project) is visible.
 *
 * Prints hostnames ONLY — never prints keys, tokens, or secret values.
 * Exits 0 in inventory mode (default, non-blocking).
 * Exits 1 only when APEX_REQUIRE_SUPABASE_ALIGNMENT=true and refs diverge.
 *
 * Usage: node scripts/ci/verify-supabase-env-alignment.mjs
 *
 * See docs/release/production-validation-harness.md → "Supabase Environment
 * Inventory" for the three intentional env contexts and the production
 * certification requirement.
 */

const extractHostname = (url) => {
  if (!url) return '(not set)';
  try {
    return new URL(url).hostname;
  } catch {
    return '(invalid URL)';
  }
};

const vars = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  E2E_SUPABASE_URL: process.env.E2E_SUPABASE_URL,
};

console.log('\n=== APEX Supabase Environment Inventory ===');
console.log('(Hostnames only — keys are never printed)\n');

const hostnames = new Set();
for (const [key, value] of Object.entries(vars)) {
  const host = extractHostname(value);
  console.log(`  ${key.padEnd(30)} -> ${host}`);
  if (host !== '(not set)' && host !== '(invalid URL)') hostnames.add(host);
}

const multipleProjects = hostnames.size > 1;
console.log(`\nUnique project refs detected: ${hostnames.size}`);

if (multipleProjects) {
  console.log('!  Multiple Supabase project refs found.');
  console.log('   This may be intentional (dev vs staging vs E2E).');
  console.log('   Confirm alignment in docs/release/production-validation-harness.md.');
}

if (process.env.APEX_REQUIRE_SUPABASE_ALIGNMENT === 'true' && multipleProjects) {
  console.error('\nx APEX_REQUIRE_SUPABASE_ALIGNMENT is set — misaligned refs fail.');
  process.exit(1);
}

console.log('\nOK Inventory complete. Exiting 0 (non-blocking).\n');
process.exit(0);
