import { createClient } from '@supabase/supabase-js';
import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
} from './supabaseConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

const isValidSupabaseUrl = hasValidSupabaseUrl(supabaseUrl);

export const hasSupabaseConfig = hasSupabaseConfigValue(supabaseUrl, supabaseAnonKey);
export const supabaseConfigTraceId = createSupabaseConfigTraceId();

if (!hasSupabaseConfig) {
  console.error(
    `[APEX OmniHub] Supabase is not configured. trace=${supabaseConfigTraceId}. ` +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Cloudflare Pages. ' +
      'VITE_SUPABASE_ANON_KEY remains supported as a legacy fallback.',
  );
}

export const supabase = createClient(
  isValidSupabaseUrl ? supabaseUrl : 'https://placeholder.supabase.co',
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
