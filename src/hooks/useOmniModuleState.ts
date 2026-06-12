// Root-package stub; tests mock this via vi.mock('@/hooks/useOmniModuleState')
// The real file lives at apps/omnihub-site/src/hooks/useOmniModuleState.ts

export interface OmniModuleItem {
  readonly id: string;
  readonly label: string;
  readonly status: 'active' | 'inactive' | 'pending' | 'error';
  readonly detail?: string;
}

export interface OmniModuleStat {
  readonly label: string;
  readonly value: string;
  readonly trend?: 'up' | 'down' | 'stable';
}

export interface OmniModuleAction {
  readonly id: string;
  readonly label: string;
  readonly variant: 'primary' | 'secondary' | 'destructive';
}

export interface OmniModuleState {
  readonly moduleKey: string;
  readonly headline: string;
  readonly stats: readonly OmniModuleStat[];
  readonly items: readonly OmniModuleItem[];
  readonly actions: readonly OmniModuleAction[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly stateKind: 'live' | 'demo' | 'local' | 'unavailable';
}

export function useOmniModuleState(_key: string): OmniModuleState {
  return { 
    moduleKey: _key,
    headline: '',
    loading: false, 
    error: null, 
    stateKind: 'local',
    items: [], 
    stats: [], 
    actions: [] 
  };
}

export async function triggerModuleAction(_key: string, _actionId: string, _selected: string[]): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '' };
}
