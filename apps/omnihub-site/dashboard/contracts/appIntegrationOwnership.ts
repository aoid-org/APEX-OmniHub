export const APP_INTEGRATION_OWNER = 'omniboard' as const;

export type IntegrationSurface =
  | 'omniboard'
  | 'apex_ecosystem'
  | 'omnislate'
  | 'settings'
  | 'header'
  | 'right_rail'
  | 'integrated_apps'
  | 'links_module'
  | 'other';

export function canOwnAppIntegration(surface: IntegrationSurface): boolean {
  return surface === APP_INTEGRATION_OWNER;
}

export function mustHandoffToOmniBoard(surface: IntegrationSurface): boolean {
  return surface !== APP_INTEGRATION_OWNER;
}
