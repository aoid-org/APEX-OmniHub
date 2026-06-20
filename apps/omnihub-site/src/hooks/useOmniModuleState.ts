/**
 * useOmniModuleState - Live data hook for OmniDash module panels.
 *
 * Fetches authenticated module state from Supabase Edge Functions.
 * Falls back to static registry data when the backend is unavailable.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { getModuleContent } from "@/dashboard/components/ModuleRegistry";
import type {
  ModuleContent,
  ModuleStatItem,
  ModuleListItem,
  ModuleAction,
} from "@/dashboard/components/ModuleRegistry";

/**
 * Normalize live module-state actions into valid ModuleAction objects.
 * The omnilink-port/module-state edge contract returns `actions` as string[]
 * action ids; ModuleShell renders action.id/action.label. Passing raw strings
 * through made those undefined, so handleAction received undefined, no module
 * could intercept its own id, and every button fell through to trigger-workflow
 * with action_id null. Normalizing here keeps state.actions as ModuleAction[].
 */
export function humanizeActionId(actionId: string): string {
  return actionId
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeLiveActions(
  rawActions: unknown,
  baselineActions: readonly ModuleAction[],
): readonly ModuleAction[] | undefined {
  if (!Array.isArray(rawActions)) {
    return undefined;
  }

  const baselineById = new Map(
    baselineActions.map((action) => [action.id, action] as const),
  );

  return rawActions
    .map((raw): ModuleAction | null => {
      if (typeof raw === "string") {
        const baseline = baselineById.get(raw);
        return (
          baseline ?? {
            id: raw,
            label: humanizeActionId(raw),
            variant: "secondary",
          }
        );
      }

      if (
        raw &&
        typeof raw === "object" &&
        "id" in raw &&
        typeof (raw as { id: unknown }).id === "string"
      ) {
        const candidate = raw as Partial<ModuleAction> & { id: string };
        const baseline = baselineById.get(candidate.id);
        return {
          id: candidate.id,
          label:
            typeof candidate.label === "string" && candidate.label.length > 0
              ? candidate.label
              : baseline?.label ?? humanizeActionId(candidate.id),
          variant:
            candidate.variant === "primary" ||
            candidate.variant === "secondary" ||
            candidate.variant === "destructive"
              ? candidate.variant
              : baseline?.variant ?? "secondary",
        };
      }

      return null;
    })
    .filter((action): action is ModuleAction => action !== null);
}

/**
 * Hard ceiling for any single backend round-trip. Guarantees `loading`
 * always resolves: if auth or the edge function hangs (no server reply),
 * the module degrades to its UNAVAILABLE/demo state instead of spinning
 * forever.
 */
const MODULE_FETCH_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("omni_module_timeout")), ms),
    ),
  ]);
}

export interface OmniModuleState {
  readonly moduleKey: string;
  readonly headline: string;
  readonly stats: readonly ModuleStatItem[];
  readonly items: readonly ModuleListItem[];
  readonly actions: readonly ModuleAction[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly stateKind: 'live' | 'demo' | 'local' | 'unavailable';
}

type LiveModuleState = Readonly<{
  key: string;
  headline?: string;
  stats?: readonly ModuleStatItem[];
  items?: readonly ModuleListItem[];
  actions?: readonly ModuleAction[];
  loading: boolean;
  error: string | null;
  stateKind: 'live' | 'demo' | 'local' | 'unavailable';
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
    stateKind: reg?.stateKind ?? 'local',
  };
}


export function useOmniModuleState(appKey: string): OmniModuleState {
  const baselineState = useMemo(() => registryStateFor(appKey), [appKey]);
  const [liveState, setLiveState] = useState<LiveModuleState>(() => ({
    key: appKey,
    loading: true,
    error: null,
    stateKind: baselineState.stateKind,
  }));

  useEffect(() => {
    let cancelled = false;

    const safeSetLiveState = (state: Omit<LiveModuleState, "key">) => {
      if (!cancelled) {
        setLiveState({ key: appKey, ...state });
      }
    };

    async function fetchLiveState() {
      if (!hasSupabaseConfig) {
        safeSetLiveState({
          loading: false,
          error: null,
          stateKind: baselineState.stateKind === 'demo' ? 'demo' : 'local',
        });
        return;
      }

      try {
        const {
          data: { user },
        } = await withTimeout(supabase.auth.getUser(), MODULE_FETCH_TIMEOUT_MS);

        if (!user || cancelled) {
          safeSetLiveState({
            loading: false,
            error: null,
            stateKind: baselineState.stateKind === 'demo' ? 'demo' : 'unavailable',
          });
          return;
        }

        const { data, error } = await withTimeout(
          supabase.functions.invoke(
            "omnilink-port/module-state",
            {
              body: { module_key: appKey },
            }
          ),
          MODULE_FETCH_TIMEOUT_MS
        );

        if (cancelled) {
          return;
        }

        if (error || !data) {
          safeSetLiveState({
            loading: false,
            error: null,
            stateKind: baselineState.stateKind === 'demo' ? 'demo' : 'unavailable',
          });
          return;
        }

        const live = data as Partial<ModuleContent>;
        safeSetLiveState({
          headline: live.headline,
          stats: live.stats,
          items: live.items,
          actions: normalizeLiveActions(live.actions, baselineState.actions),
          loading: false,
          error: null,
          stateKind: "live",
        });
      } catch {
        safeSetLiveState({
          loading: false,
          error: null,
          stateKind: baselineState.stateKind === 'demo' ? 'demo' : 'unavailable',
        });
      }
    }

    void fetchLiveState();

    return () => {
      cancelled = true;
    };
  }, [appKey, baselineState.stateKind, baselineState.actions]);

  if (liveState.key !== appKey) {
    return baselineState;
  }

  // Fall back to baseline fields ONLY if not live and not unavailable
  // Actually, if unavailable, we should still return some baseline shape but strictly 'unavailable'.
  // We'll keep baseline stats/items if demo or local, but empty them if unavailable?
  // The Prompt: "Fetch failure renders UNAVAILABLE unless explicit demo fallback flag is set."
  const useBaseline = liveState.stateKind === 'demo' || liveState.stateKind === 'local';

  return {
    ...baselineState,
    headline: liveState.headline ?? baselineState.headline,
    stats: useBaseline ? baselineState.stats : (liveState.stats ?? []),
    items: useBaseline ? baselineState.items : (liveState.items ?? []),
    actions: useBaseline ? baselineState.actions : (liveState.actions ?? []),
    loading: liveState.loading,
    error: liveState.error,
    stateKind: liveState.stateKind,
  };
}

/**
 * triggerModuleAction - Dispatches a module action to the backend workflow engine.
 *
 * Calls the trigger-workflow Edge Function to execute a Temporal saga
 * for the given module and action.
 *
 * Every round-trip (auth + invoke) is wrapped in the same hard timeout as
 * module-state fetching so an action button can never spin forever — on a hang
 * it resolves to a visible "timed out" message instead. The return is always a
 * structured { success, message } so the UI never silently succeeds or no-ops.
 */
export async function triggerModuleAction(
  moduleKey: string,
  actionId: string,
  selectedItems: readonly string[]
): Promise<{ success: boolean; message: string }> {
  if (!hasSupabaseConfig) {
    return {
      success: false,
      message: `Not Implemented: Action "${actionId}" requires a connected backend (offline mode).`,
    };
  }

  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), MODULE_FETCH_TIMEOUT_MS);
    if (!user) {
      return {
        success: false,
        message: "Authentication required. Please sign in.",
      };
    }

    const { data, error } = await withTimeout(
      supabase.functions.invoke("trigger-workflow", {
        body: {
          kind: "module_action",
          module_key: moduleKey,
          action_id: actionId,
          selected_items: [...selectedItems],
          trace_id: crypto.randomUUID(),
          idempotency_key: crypto.randomUUID(),
        },
      }),
      MODULE_FETCH_TIMEOUT_MS
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
    if (err instanceof Error && err.message === "omni_module_timeout") {
      return {
        success: false,
        message: `Action "${actionId}" timed out — the backend did not respond. Please try again.`,
      };
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message: `Action failed: ${msg}` };
  }
}
