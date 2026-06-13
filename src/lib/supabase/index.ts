export { supabase, createSupabaseClient } from './client';
export const hasSupabaseConfig = !!(
  import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY
);

// Test-double parity with the canonical apps/omnihub-site/src/lib/supabase.ts
// surface. vitest.config.ts maps '@' -> ./src, so the test tree resolves these
// from here; the production Vite build resolves the canonical module instead.
export const supabaseConfigTraceId = 'root-stub-no-trace';
export const supabaseConfigStatus = {
  hasUrl: Boolean(import.meta.env?.VITE_SUPABASE_URL),
  hasKey: Boolean(import.meta.env?.VITE_SUPABASE_ANON_KEY),
  urlHost: '',
  keyKind: 'none',
  traceId: supabaseConfigTraceId,
};
