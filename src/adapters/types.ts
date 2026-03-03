export interface RegistryApp {
  id: string;
  displayName?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'pending';
  meta?: { iconUrl?: string; [key: string]: unknown };
  allowedActions?: Array<{ key: string; label: string; enabled: boolean }>;
  [key: string]: unknown;
}

export interface OmniDashUIApp {
  id: string;
  label: string;
  iconUrl: string | null;
  status: RegistryApp['connectionStatus'];
  actions: Array<{ key: string; label: string; disabled: boolean }>;
  /** Escape hatch — never render raw directly. */
  raw: RegistryApp;
}
