// Root-package stub consumed by the Vitest module graph.
//
// vitest.config.ts intentionally maps '@' -> ./src so tests exercise a
// lightweight module-state double, while vite.config.ts and the production
// build map '@' -> ./apps/omnihub-site/src (the Supabase-backed canonical
// implementation at apps/omnihub-site/src/hooks/useOmniModuleState.ts).
//
// This stub mirrors the canonical exported types so the type checker resolves
// the same shape regardless of which tree wins resolution; tests still override
// behaviour via vi.mock('@/hooks/useOmniModuleState').
import type {
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
  readonly stateKind: 'live' | 'demo' | 'local' | 'unavailable';
  /** Mirrors canonical: optional in-place refresh (no-op in the stub). */
  readonly refetch?: () => void;
}

export function useOmniModuleState(moduleKey: string): OmniModuleState {
  return {
    moduleKey,
    headline: '',
    stats: [],
    items: [],
    actions: [],
    loading: false,
    error: null,
    stateKind: 'local',
  };
}

export async function triggerModuleAction(
  _moduleKey: string,
  _actionId: string,
  _selectedItems: readonly string[],
): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Not implemented (stub).' };
}
