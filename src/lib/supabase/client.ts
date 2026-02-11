import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export { supabase } from '@/integrations/supabase/client';

type SupabaseClientOptions = {
  url: string;
  apiKey: string;
  serviceRoleKey?: string;
  debug?: boolean;
};

// Phase 2: Database Client Convergence
// This factory now returns the singleton instance from integrations/supabase/client.ts
// to eliminate "Split Brain" architecture and enforce a Single Source of Truth.
// Options are intentionally ignored to prevent configuration drift.
export function createSupabaseClient(options?: SupabaseClientOptions): SupabaseClient<Database> {
  if (options?.debug) {
    console.warn('[SupabaseClient] createSupabaseClient called with options, but returning singleton instance to enforce Source of Truth.');
  }

  // Security Guard: Still warn if someone tries to pass service role key in browser,
  // even though we are ignoring it, to alert developer of bad practice.
  if (typeof globalThis.window !== 'undefined' && options?.serviceRoleKey) {
     console.error('CRITICAL SECURITY WARNING: Service Role Key passed to client factory in browser environment. It is ignored, but this is a security risk.');
  }

  // We re-import here to ensure side-effects of the singleton initialization run if they haven't already,
  // although the top-level export does this too.
  // Using require or distinct import might be needed if we wanted to avoid circular deps,
  // but here we just need to return the exported instance.
  // Since we use `export { supabase } from ...` above, we can't access `supabase` locally as a value easily without importing it again or using a slightly different pattern.
  // Let's adjust the imports to be cleaner.

  // Actually, to use it in this function, we need to import it.
  // The 'export ... from' syntax exports it but doesn't bind it locally in the scope.
  // So we will revert to import + export pattern but formatted as one line if possible, or just import it.

  // Re-reading the requirement: "Use `export…from` to re-export `supabase`."
  // If I do `export { supabase } from ...`, I cannot use `supabase` in `createSupabaseClient`.
  // So I must import it.

  return require('@/integrations/supabase/client').supabase;
}
