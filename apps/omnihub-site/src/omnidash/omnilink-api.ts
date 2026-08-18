/**
 * apps/omnihub-site/src/omnidash/omnilink-api.ts
 *
 * Thin omnihub-site-scoped API layer for OmniLink integrations.
 * Provides the subset of functions consumed by OmniBoard and IntegrationOnboarder.
 *
 * Canonical implementation lives at src/omnidash/omnilink-api.ts (root).
 * This file re-implements only the two surface functions needed by the UI,
 * using @/ paths that resolve correctly in the omnihub-site Vite context.
 */
import { supabase } from '@/integrations/supabase/client';

/** Minimal row shape returned from the omnilink_integrations table. */
export interface OmniLinkIntegrationRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Fetch all OmniLink integrations for a given user.
 * Used by OmniBoard to build the `connectedIds` set.
 */
export async function fetchOmniLinkIntegrations(
  userId: string,
): Promise<OmniLinkIntegrationRow[]> {
  const { data, error } = await supabase
    .from('omnilink_integrations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[omnilink-api] fetchOmniLinkIntegrations error:', error.message);
    return [];
  }
  return (data ?? []) as OmniLinkIntegrationRow[];
}

/**
 * Persist a new custom integration to the omnilink_integrations table.
 * Called by IntegrationOnboarder on wizard completion.
 */
export async function createOmniLinkIntegration(
  userId: string,
  name: string,
  type: string,
): Promise<OmniLinkIntegrationRow> {
  const { data, error } = await supabase
    .from('omnilink_integrations')
    .insert({
      user_id: userId,
      name,
      type,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`[omnilink-api] createOmniLinkIntegration failed: ${error.message}`);
  }
  return data as OmniLinkIntegrationRow;
}
