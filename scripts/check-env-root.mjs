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

const required = ['VITE_SUPABASE_URL'];
const missing = required.filter((k) => !process.env[k]);

if (!process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  missing.push('VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)');
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
  console.warn(
    'WARNING: Proceeding with build — auth will show "Login is unavailable"',
  );
  console.warn('         at runtime until env vars are correctly injected.\n');
  // Exit 0 so the build proceeds — the Login page runtime check
  // already surfaces a clear error to users when config is missing.
  process.exit(0);
}

// Diagnostic: log which env vars Vite will inline (values redacted)
console.warn('\nAPEX BUILD GUARD — Environment variables OK:');
console.warn(`   VITE_SUPABASE_URL = ${process.env.VITE_SUPABASE_URL?.slice(0, 30)}...`);
console.warn(
  `   VITE_SUPABASE_PUBLISHABLE_KEY = ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '[set]' : '[not set]'}`,
);
console.warn(
  `   VITE_SUPABASE_ANON_KEY = ${process.env.VITE_SUPABASE_ANON_KEY ? '[set]' : '[not set]'}`,
);
console.warn('');
