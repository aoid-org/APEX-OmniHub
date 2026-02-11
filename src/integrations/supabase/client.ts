import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// User's own Supabase (highest priority)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Accept multiple key formats for user-provided keys
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');

  const errorMessage = `APEX Critical Failure: Supabase env vars missing (${missing.join(', ')}). Aborting Launch.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Safer access to localStorage for SSR/non-browser environments
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Log which Supabase instance is being used (dev only)
if (import.meta.env.DEV) {
  console.log('✅ Using Supabase instance:', SUPABASE_URL);
}
