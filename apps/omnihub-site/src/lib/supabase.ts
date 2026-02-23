import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';

// Accept both naming conventions:
// - VITE_SUPABASE_PUBLISHABLE_KEY  (documented in .env.example — primary)
// - VITE_SUPABASE_ANON_KEY         (legacy alias used by some Supabase tooling)
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  '';

const hasValidSupabaseUrl = /^https?:\/\//i.test(supabaseUrl);

export const hasSupabaseConfig = hasValidSupabaseUrl && supabaseAnonKey.length > 0;

// Startup guardrail: emit a clear diagnostic when config is absent.
// Always logs so operators can diagnose missing Vercel env vars without
// needing to reproduce locally.
if (!hasSupabaseConfig) {
  const missing: string[] = [];
  if (!hasValidSupabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  console.error(
    '[APEX OmniHub] Supabase is not configured. Missing env vars:',
    missing.join(', '),
    '— Set these in Vercel → Settings → Environment Variables. Auth is disabled until configured.'
  );
}

export const supabase = createClient(
  hasValidSupabaseUrl ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
