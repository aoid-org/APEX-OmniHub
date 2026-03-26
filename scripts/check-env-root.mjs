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
  console.error('\n========================================================');
  console.error(' APEX BUILD GUARD — Missing required environment variables');
  console.error('========================================================\n');
  missing.forEach((k) => console.error(`   - ${k}`));
  console.error(
    '\nFix: Cloudflare Pages -> Project -> Settings -> Environment Variables',
  );
  console.error(
    '     Add the missing keys, then trigger a new deployment.\n',
  );
  console.error(
    'Hint: CF Pages only rebuilds on git push — adding env vars alone',
  );
  console.error(
    '      does NOT trigger a redeploy. Use the dashboard "Retry" button',
  );
  console.error('      or push an empty commit to force a rebuild.\n');
  process.exit(1);
}

// Diagnostic: log which env vars Vite will inline (values redacted)
console.log('\nAPEX BUILD GUARD — Environment variables OK:');
console.log(`   VITE_SUPABASE_URL = ${process.env.VITE_SUPABASE_URL?.slice(0, 30)}...`);
console.log(
  `   VITE_SUPABASE_PUBLISHABLE_KEY = ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '[set]' : '[not set]'}`,
);
console.log(
  `   VITE_SUPABASE_ANON_KEY = ${process.env.VITE_SUPABASE_ANON_KEY ? '[set]' : '[not set]'}`,
);
console.log('');
