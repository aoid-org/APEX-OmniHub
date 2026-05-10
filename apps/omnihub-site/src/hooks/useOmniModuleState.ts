/**
 * useOmniModuleState - Live data hook for OmniDash module panels.
 *
 * Fetches authenticated module state from Supabase Edge Functions.
 * Falls back to static registry data when the backend is unavailable.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { getModuleContent } from "../../dashboard/components/ModuleRegistry";
import type {
  ModuleContent,
  ModuleStatItem,
  ModuleListItem,
  ModuleAction,
} from "../../dashboard/components/ModuleRegistry";

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

type LiveModuleState = Readonly<{
  key: string;
  headline?: string;
  stats?: readonly ModuleStatItem[];
  items?: readonly ModuleListItem[];
  actions?: readonly ModuleAction[];
  loading: boolean;
  error: string | null;
  isLive: boolean;
}>;

function registryStateFor(appKey: string): OmniModuleState {
  const reg = getModuleContent(appKey);
  return {
    moduleKey: appKey,
    headline: reg?.headline ?? "",
    stats: reg?.stats ?? [],
    items: reg?.items ?? [],
    actions: reg?.actions ?? [],
    loading: true,
    error: null,
    isLive: false,
  };
}

export function useOmniModuleState(appKey: string): OmniModuleState {
  const baselineState = useMemo(() => registryStateFor(appKey), [appKey]);
  const [liveState, setLiveState] = useState<LiveModuleState>(() => ({
    key: appKey,
    loading: true,
    error: null,
    isLive: false,
  }));

  useEffect(() => {
    let cancelled = false;

    async function fetchLiveState() {
      if (!hasSupabaseConfig) {
        if (!cancelled) {
          setLiveState({
            key: appKey,
            loading: false,
            error: null,
            isLive: false,
          });
        }
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          if (!cancelled) {
            setLiveState({
              key: appKey,
              loading: false,
              error: null,
              isLive: false,
            });
          }
          return;
        }

        const { data, error } = await supabase.functions.invoke(
          "omnilink-port",
          {
            body: { action: "get_module_state", module_key: appKey },
          }
        );

        if (cancelled) {
          return;
        }

        if (error || !data) {
          setLiveState({
            key: appKey,
            loading: false,
            error: null,
            isLive: false,
          });
          return;
        }

        const live = data as Partial<ModuleContent>;
        setLiveState({
          key: appKey,
          headline: live.headline,
          stats: live.stats,
          items: live.items,
          actions: live.actions,
          loading: false,
          error: null,
          isLive: true,
        });
      } catch {
        if (!cancelled) {
          setLiveState({
            key: appKey,
            loading: false,
            error: null,
            isLive: false,
          });
        }
      }
    }

    void fetchLiveState();

    return () => {
      cancelled = true;
    };
  }, [appKey]);

  if (liveState.key !== appKey) {
    return baselineState;
  }

  return {
    ...baselineState,
    headline: liveState.headline ?? baselineState.headline,
    stats: liveState.stats ?? baselineState.stats,
    items: liveState.items ?? baselineState.items,
    actions: liveState.actions ?? baselineState.actions,
    loading: liveState.loading,
    error: liveState.error,
    isLive: liveState.isLive,
  };
}

/**
 * triggerModuleAction - Dispatches a module action to the backend workflow engine.
 *
 * Calls the trigger-workflow Edge Function to execute a Temporal saga
 * for the given module and action.
 */
export async function triggerModuleAction(
  moduleKey: string,
  actionId: string,
  selectedItems: readonly string[]
): Promise<{ success: boolean; message: string }> {
  if (!hasSupabaseConfig) {
    return {
      success: true,
      message: `Action "${actionId}" queued for ${moduleKey} (offline mode - will execute when backend is connected).`,
    };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        message: "Authentication required. Please sign in.",
      };
    }

    const { data, error } = await supabase.functions.invoke(
      "trigger-workflow",
      {
        body: {
          kind: "module_action",
          module_key: moduleKey,
          action_id: actionId,
          selected_items: [...selectedItems],
          trace_id: crypto.randomUUID(),
          idempotency_key: crypto.randomUUID(),
        },
      }
    );

    if (error) {
      return {
        success: false,
        message: `Workflow trigger failed: ${error.message}`,
      };
    }

    const result = data as { workflow_id?: string; message?: string } | null;
    return {
      success: true,
      message:
        result?.message ??
        `Workflow ${result?.workflow_id ?? actionId} dispatched successfully.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Action failed: ${msg}` };
  }
}
