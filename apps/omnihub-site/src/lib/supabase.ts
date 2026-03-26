import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  '';

const hasValidSupabaseUrl = /^https?:\/\//i.test(supabaseUrl);

export const hasSupabaseConfig = hasValidSupabaseUrl && supabaseAnonKey.length > 0;
export const supabaseConfigTraceId = `cfg-${Math.random().toString(36).slice(2, 10)}`;

if (
  !import.meta.env.VITE_SUPABASE_URL ||
  (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
) {
  console.error(
    `[APEX OmniHub] Supabase is not configured. trace=${supabaseConfigTraceId}. ` +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Cloudflare Pages. ' +
      'VITE_SUPABASE_ANON_KEY remains supported as a legacy fallback.',
  );
}

export const supabase = createClient(
  hasValidSupabaseUrl ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      storage: globalThis.window === undefined ? undefined : globalThis.window.localStorage,
    },
  },
);
