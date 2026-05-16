import { createClient } from '@supabase/supabase-js';
import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
} from './supabaseConfig';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

function isValidKeyFormat(key: string): boolean {
  return key.startsWith('eyJ') || key.startsWith('sb_publishable_');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseUrl = hasValidSupabaseUrl(rawUrl) ? rawUrl : '';

const rawKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';
const supabaseAnonKey = isValidKeyFormat(rawKey) ? rawKey : '';

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
  isValidSupabaseUrl ? supabaseUrl : PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      storage: globalThis.window === undefined ? undefined : globalThis.window.localStorage,
    },
  },
);
