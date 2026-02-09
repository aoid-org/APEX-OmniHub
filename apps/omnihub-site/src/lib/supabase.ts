import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const hasValidSupabaseUrl = /^https?:\/\//i.test(supabaseUrl);

export const hasSupabaseConfig = hasValidSupabaseUrl && supabaseAnonKey.length > 0;

export const supabase = createClient(
  hasValidSupabaseUrl ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
