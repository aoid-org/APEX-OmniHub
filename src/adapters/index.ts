import type { RegistryApp, OmniDashUIApp } from './types';

/** All 14 integrated apps must pass through toOmniDashUI() before reaching React. */
export function toOmniDashUI(app: RegistryApp): OmniDashUIApp {
  return {
    id: app.id,
    label: app.displayName ?? app.id,
    iconUrl: app.meta?.iconUrl ?? null,
    status: app.connectionStatus,
    actions: (app.allowedActions ?? []).map((a) => ({
      key: a.key,
      label: a.label,
      disabled: !a.enabled,
    })),
    raw: app,
  };
}

export function toOmniDashUIList(apps: RegistryApp[]): OmniDashUIApp[] {
  return apps.map(toOmniDashUI);
}
