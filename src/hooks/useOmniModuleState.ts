// Root-package stub; tests mock this via vi.mock('@/hooks/useOmniModuleState')
// The real file lives at apps/omnihub-site/src/hooks/useOmniModuleState.ts
export interface OmniModuleItem {
  id: string;
  label: string;
  status: string;
}

export interface OmniModuleStat {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface OmniModuleAction {
  id: string;
  label: string;
}

export interface OmniModuleState {
  loading: boolean;
  error: string | null;
  items: OmniModuleItem[];
  stats: OmniModuleStat[];
  actions: OmniModuleAction[];
  title?: string;
  description?: string;
}

export function useOmniModuleState(_key: string): OmniModuleState {
  return { loading: false, error: null, items: [], stats: [], actions: [] };
}

export async function triggerModuleAction(_key: string, _actionId: string, _selected: string[]): Promise<{ success: boolean }> {
  return { success: false };
}
