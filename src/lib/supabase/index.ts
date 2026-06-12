export { supabase, createSupabaseClient } from './client';
export const hasSupabaseConfig = !!(
  import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY
);
export const supabaseConfigStatus = { hasUrl: false, hasKey: false, urlHost: '', keyKind: '', traceId: '' };
export const supabaseConfigTraceId = '';
