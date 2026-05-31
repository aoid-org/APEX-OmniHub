#!/usr/bin/env node
/**
 * APEX OmniHub - Build Environment Guard
 * Warns for missing local Supabase config, and fails hard when a provided
 * legacy anon JWT belongs to a different Supabase project than the URL.
 */
const required = ['VITE_SUPABASE_URL'];
const missing = required.filter((key) => !process.env[key]);
const rawUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
}

function getSupabaseProjectRefFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.endsWith('.supabase.co') ? hostname.slice(0, -'.supabase.co'.length) : '';
  } catch {
    return '';
  }
}

function getJwtProjectRef(key) {
  const parts = key.split('.');
  if (parts.length !== 3 || !parts[1] || !key.startsWith('eyJ')) return '';

  try {
    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    return typeof payload.ref === 'string' ? payload.ref.toLowerCase() : '';
  } catch {
    return '';
  }
}

const urlProjectRef = getSupabaseProjectRefFromUrl(rawUrl);
const keyProjectRef = getJwtProjectRef(rawKey);

if (urlProjectRef && keyProjectRef && urlProjectRef !== keyProjectRef) {
  console.error('\nAPEX BUILD GUARD - Supabase URL/key project mismatch:\n');
  console.error(`   - VITE_SUPABASE_URL project ref: ${urlProjectRef}`);
  console.error(`   - Browser key project ref: ${keyProjectRef}`);
  console.error(
    '\nFix: Cloudflare Pages -> Project -> Settings -> Environment Variables -> set ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY from the same Supabase project as VITE_SUPABASE_URL, then redeploy.\n',
  );
  process.exit(1);
}

if (missing.length > 0) {
  console.error('\nAPEX BUILD GUARD - Missing required environment variables:\n');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error(
    '\nFix: Cloudflare Pages -> Project -> Settings -> Environment Variables -> add missing keys -> redeploy\n' +
      'Note: local UI-only builds may set APEX_ALLOW_MISSING_SUPABASE_CONFIG=true.\n',
  );
  console.log('APEX BUILD GUARD - Continuing local build with missing Supabase config warning.\n');
} else {
  console.log('APEX BUILD GUARD - Supabase environment variables present and internally consistent.\n');
}
