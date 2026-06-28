/**
 * @deprecated Superseded by ./omniSurfaceOwnership (two-owner canon).
 *
 * This shim remains for backward compatibility and re-exports the new canon.
 * The legacy single-owner model — OmniBoard as the UNIVERSAL app-integration
 * owner — is RETIRED: APEX ecosystem apps are owned by APEX Apps (MCP/OmniPort),
 * not OmniBoard. New code must import from ./omniSurfaceOwnership directly and
 * use ownerForIntegration(kind) / connectModuleKey(kind).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
export * from './omniSurfaceOwnership';

/**
 * @deprecated OmniBoard is no longer the universal owner. Use
 * ownerForIntegration(kind) from ./omniSurfaceOwnership.
 */
export const APP_INTEGRATION_OWNER = 'omniboard' as const;

/** @deprecated Use OmniSurface / IntegrationKind from ./omniSurfaceOwnership. */
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

/**
 * @deprecated Two owners now exist. A surface "can own" an integration only for
 * the kind it owns: omniboard→third-party, apex_ecosystem→first-party.
 */
export function canOwnAppIntegration(surface: IntegrationSurface): boolean {
  return surface === 'omniboard' || surface === 'apex_ecosystem';
}

/**
 * @deprecated APEX ecosystem apps must NOT hand off to OmniBoard — only genuine
 * third-party surfaces do. Use connectModuleKey(kind) for routing.
 */
export function mustHandoffToOmniBoard(surface: IntegrationSurface): boolean {
  if (surface === 'apex_ecosystem') return false;
  return surface !== 'omniboard';
}
