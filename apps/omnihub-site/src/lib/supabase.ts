import { createClient } from '@supabase/supabase-js';
import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
} from './supabaseConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

// Accept both naming conventions:
// - VITE_SUPABASE_PUBLISHABLE_KEY  (documented in .env.example — primary)
// - VITE_SUPABASE_ANON_KEY         (legacy alias used by some Supabase tooling)
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  '';

const isValidSupabaseUrl = hasValidSupabaseUrl(supabaseUrl);

export const hasSupabaseConfig = hasSupabaseConfigValue(supabaseUrl, supabaseAnonKey);
export const supabaseConfigTraceId = createSupabaseConfigTraceId();

// Startup guardrail: emit a clear diagnostic when config is absent.
// Always logs so operators can diagnose missing env vars without
// needing to reproduce locally.
if (!hasSupabaseConfig) {
  const missing: string[] = [];
  if (!isValidSupabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  console.error(
    `[APEX OmniHub] Supabase is not configured. trace=${supabaseConfigTraceId}. Missing env vars:`,
    missing.join(', '),
    '— Set these in Cloudflare Pages → Settings → Environment Variables. Auth is disabled until configured.'
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
