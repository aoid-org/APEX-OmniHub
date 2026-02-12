import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

export { supabase };

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

  return supabase;
}
