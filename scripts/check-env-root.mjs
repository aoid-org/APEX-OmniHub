#!/usr/bin/env node
/**
 * APEX OmniHub - Root Build Environment Guard
 *
 * Validates that required VITE_* env vars are present in process.env
 * BEFORE Vite runs.  Vite inlines import.meta.env.VITE_* at build time,
 * so missing vars produce a silently broken bundle (auth shows
 * "Authentication service not configured" at runtime).
 *
 * Cloudflare Pages injects dashboard env vars into process.env during
 * the build step.  If you add/change vars in the CF Pages dashboard you
 * MUST trigger a new deployment (git push or manual redeploy) — CF Pages
 * does NOT rebuild automatically on env-var changes.
 */

import fs from 'node:fs';

// Try loading local environment files if not already set in process.env
if (!process.env.VITE_SUPABASE_URL && !process.env.SUPABASE_URL) {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
    dotenv.config({ path: '.env' });
    dotenv.config({ path: 'apps/omnihub-site/.env.local' });
    dotenv.config({ path: 'apps/omnihub-site/.env' });
  } catch {}
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseClientKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;


const allowMissingSupabaseConfig = process.env.APEX_ALLOW_MISSING_SUPABASE_CONFIG === 'true';
const isCiOrProduction =
  process.env.CI === 'true' ||
  process.env.NODE_ENV === 'production' ||
  process.env.CF_PAGES === '1' ||
  process.env.CF_PAGES === 'true';

const missing = [];
if (!supabaseUrl) {
  missing.push('VITE_SUPABASE_URL (or SUPABASE_URL)');
}
if (!supabaseClientKey) {
  missing.push('VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY)');
}

if (missing.length > 0) {
  console.warn('\n========================================================');
  console.warn(' APEX BUILD GUARD — Missing required environment variables');
  console.warn('========================================================\n');
  missing.forEach((k) => console.warn(`   - ${k}`));
  console.warn(
    '\nFix: Cloudflare Pages -> Project -> Settings -> Environment Variables',
  );
  console.warn(
    '     Add the missing keys, then trigger a new deployment.\n',
  );
  console.warn(
    'Hint: CF Pages only rebuilds on git push — adding env vars alone',
  );
  console.warn(
    '      does NOT trigger a redeploy. Use the dashboard "Retry" button',
  );
  console.warn('      or push an empty commit to force a rebuild.\n');
  const isPreview = process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main';
  if (allowMissingSupabaseConfig && (!isCiOrProduction || isPreview)) {
    console.warn(
      'WARNING: Proceeding because APEX_ALLOW_MISSING_SUPABASE_CONFIG=true in local development or Preview Build.',
    );
    console.warn('         Auth remains unavailable until env vars are configured.\n');
    process.exit(0);
  }
  if (isPreview) {
    console.warn(
      'WARNING: Proceeding without Supabase configuration for Cloudflare Pages Preview build.',
    );
    console.warn('         Auth remains unavailable until env vars are configured.\n');
    process.exit(0);
  }

  console.error(
    'ERROR: Failing closed. Set APEX_ALLOW_MISSING_SUPABASE_CONFIG=true only for local development.',
  );
  process.exit(1);
}

function getSupabaseClientKeySource() {
  if (process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    return 'VITE_SUPABASE_PUBLISHABLE_KEY';
  }

  if (process.env.VITE_SUPABASE_ANON_KEY) {
    return 'VITE_SUPABASE_ANON_KEY';
  }

  if (process.env.SUPABASE_PUBLISHABLE_KEY) {
    return 'SUPABASE_PUBLISHABLE_KEY';
  }

  return 'SUPABASE_ANON_KEY';
}

const supabaseUrlSource = process.env.VITE_SUPABASE_URL
  ? 'VITE_SUPABASE_URL'
  : 'SUPABASE_URL';
const supabaseClientKeySource = getSupabaseClientKeySource();

// Diagnostic: log which env vars Vite will inline (values redacted)
console.warn('\nAPEX BUILD GUARD — Environment variables OK:');
console.warn(`   Supabase URL source = ${supabaseUrlSource}`);
console.warn(`   Supabase client key source = ${supabaseClientKeySource}`);
console.warn('');
