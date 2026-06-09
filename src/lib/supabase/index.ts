export { supabase, createSupabaseClient } from './client';
export const hasSupabaseConfig = !!(
  import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY
);
