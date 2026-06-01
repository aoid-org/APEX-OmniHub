#!/usr/bin/env node
/**
 * APEX OmniHub - Build Environment Guard
 * Exits 1 immediately if required env vars are absent.
 * Prevents a broken production deploy from going live silently.
 */
const required = ['VITE_SUPABASE_URL'];
const missing = required.filter((key) => !process.env[key]);

if (!process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  missing.push('VITE_SUPABASE_ANON_KEY');
}

if (missing.length > 0) {
  console.error('\nAPEX BUILD GUARD - Missing required environment variables:\n');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error(
    '\nFix: Cloudflare Pages -> Project -> Settings -> Environment Variables -> add missing keys -> redeploy\n',
    'Note: Env vars added after the last build require a manual redeploy (CF Pages only rebuilds on git push).\n',
  );
  
  const isProd = process.env.CI === 'true' || 
                 process.env.NODE_ENV === 'production' || 
                 process.env.CF_PAGES === '1' || 
                 process.env.CF_PAGES === 'true';
                 
  if (isProd) {
    process.exit(1);
  }
} else {
  console.log('APEX BUILD GUARD - All required environment variables present.\n');
}
