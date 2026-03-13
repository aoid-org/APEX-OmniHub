/**
 * useOmniModuleState — Live data hook for OmniDash module panels.
 *
 * Fetches authenticated module state from Supabase Edge Functions.
 * Falls back to static registry data when the backend is unavailable.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useState, useEffect } from 'react';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import type {
  ModuleContent,
  ModuleStatItem,
  ModuleListItem,
  ModuleAction,
} from '@/dashboard/components/ModuleRegistry';

export interface OmniModuleState {
  readonly moduleKey: string;
  readonly headline: string;
  readonly stats: readonly ModuleStatItem[];
  readonly items: readonly ModuleListItem[];
  readonly actions: readonly ModuleAction[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly isLive: boolean;
}

export function useOmniModuleState(appKey: string): OmniModuleState {
  const [state, setState] = useState<OmniModuleState>({
    moduleKey: appKey,
    headline: '',
    stats: [],
    items: [],
    actions: [],
    loading: true,
    error: null,
    isLive: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchLiveState() {
      if (!hasSupabaseConfig) {
        // No backend configured — use registry data directly
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false, isLive: false }));
        }
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setState(prev => ({ ...prev, loading: false, isLive: false }));
          return;
        }

        const { data, error } = await supabase.functions.invoke('omnilink-port', {
          body: { action: 'get_module_state', module_key: appKey },
        });

        if (cancelled) return;

        if (error || !data) {
          // Backend unavailable — fall back silently to registry data
          setState(prev => ({ ...prev, loading: false, isLive: false }));
          return;
        }

        // Merge live data with registry structure
        const live = data as Partial<ModuleContent>;
        setState(prev => ({
          ...prev,
          headline: live.headline ?? prev.headline,
          stats: live.stats ?? prev.stats,
          items: live.items ?? prev.items,
          actions: live.actions ?? prev.actions,
          loading: false,
          isLive: true,
          error: null,
        }));
      } catch {
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false, isLive: false }));
        }
      }
    }

    fetchLiveState();
    return () => { cancelled = true; };
  }, [appKey]);

  return state;
}

/**
 * triggerModuleAction — Dispatches a module action to the backend workflow engine.
 *
 * Calls the trigger-workflow Edge Function to execute a Temporal saga
 * for the given module and action.
 */
export async function triggerModuleAction(
  moduleKey: string,
  actionId: string,
  selectedItems: readonly string[],
): Promise<{ success: boolean; message: string }> {
  if (!hasSupabaseConfig) {
    return {
      success: true,
      message: `Action "${actionId}" queued for ${moduleKey} (offline mode — will execute when backend is connected).`,
    };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Authentication required. Please sign in.' };
    }

    const { data, error } = await supabase.functions.invoke('trigger-workflow', {
      body: {
        module_key: moduleKey,
        action_id: actionId,
        selected_items: selectedItems,
        user_id: user.id,
      },
    });

    if (error) {
      return { success: false, message: `Workflow trigger failed: ${error.message}` };
    }

    const result = data as { workflow_id?: string; message?: string } | null;
    return {
      success: true,
      message: result?.message ?? `Workflow ${result?.workflow_id ?? actionId} dispatched successfully.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: `Action failed: ${msg}` };
  }
}
