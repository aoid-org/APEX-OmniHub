import { createClient } from '@supabase/supabase-js';
import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
} from './supabaseConfig';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

function getKeyKind(key: string): 'jwt' | 'publishable' | 'anon' | 'invalid' {
  if (key.startsWith('eyJ')) return 'jwt';
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (key.startsWith('sb_anon_')) return 'anon';
  return 'invalid';
}

function isBrowserSafeKeyKind(kind: ReturnType<typeof getKeyKind>): boolean {
  return kind === 'jwt' || kind === 'publishable' || kind === 'anon';
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseUrl = hasValidSupabaseUrl(rawUrl) ? rawUrl : '';

const rawKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const keyKind = getKeyKind(rawKey);
const supabaseAnonKey = isBrowserSafeKeyKind(keyKind) ? rawKey : '';

const isValidSupabaseUrl = hasValidSupabaseUrl(supabaseUrl);

export const hasSupabaseConfig = hasSupabaseConfigValue(supabaseUrl, supabaseAnonKey);
export const supabaseConfigTraceId = createSupabaseConfigTraceId();

const urlHost = (() => {
  if (!supabaseUrl) return '';
  try {
    return new URL(supabaseUrl).host;
  } catch {
    return '';
  }
})();

export const supabaseConfigStatus = {
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
  urlHost,
  keyKind,
  traceId: supabaseConfigTraceId,
};

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
