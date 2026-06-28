/**
 * omniSurfaceOwnership — Canonical OmniDash surface ownership (two-owner model).
 *
 * Single source of truth for which surface owns which kind of app integration.
 * SUPERSEDES the legacy single-owner appIntegrationOwnership.ts (which now
 * re-exports from here). App integration has TWO distinct owners:
 *
 *   - OmniBoard  → THIRD-PARTY provider / SaaS connections (connector sessions,
 *                  connection specs).
 *   - APEX Apps  → FIRST-PARTY APEX ecosystem app connection over MCP / OmniPort.
 *
 * HARD RULE: "Add APEX App" opens the APEX Apps MCP modal (module key
 * `apex-apps-mcp`), NEVER OmniBoard. Third-party connections hand off to
 * OmniBoard. Any non-owner surface hands off to the correct owner.
 *
 * Mirrors AGENTS.md §7 (Canonical Surface Ownership).
 * OWNED BY: APEX Business Systems Ltd.
 */

export type OmniSurface =
  | 'omniboard'
  | 'apex_apps'
  | 'files'
  | 'omnimedia'
  | 'language';

/** The two kinds of app integration, each owned by exactly one surface. */
export type IntegrationKind = 'third_party' | 'apex_ecosystem';

/** Module keys each connect CTA routes to (wired in ModuleRenderer). */
export const APEX_APPS_MODULE_KEY = 'apex-apps-mcp' as const;
export const OMNIBOARD_MODULE_KEY = 'omniboard-wizard' as const;

export interface SurfaceOwnership {
  readonly surface: OmniSurface;
  readonly owns: string;
  readonly forbidden: string;
}

export const SURFACE_OWNERSHIP: Readonly<Record<OmniSurface, SurfaceOwnership>> = {
  omniboard: {
    surface: 'omniboard',
    owns: 'third-party provider connections, connector sessions, connection specs',
    forbidden: 'internal APEX app install, media, playback',
  },
  apex_apps: {
    surface: 'apex_apps',
    owns: 'first-party APEX ecosystem registry, MCP/OmniPort app connect/install flow',
    forbidden: 'third-party provider connections',
  },
  files: {
    surface: 'files',
    owns: 'file upload and management; feeds OmniMedia',
    forbidden: 'third-party connections, app install',
  },
  omnimedia: {
    surface: 'omnimedia',
    owns: 'media catalog, gallery, playback, ingestion',
    forbidden: 'third-party connections, app install',
  },
  language: {
    surface: 'language',
    owns: 'locale selection and persistence (apex_locale)',
    forbidden: 'integration ownership',
  },
};

/** Which surface owns a given integration kind. */
export function ownerForIntegration(kind: IntegrationKind): OmniSurface {
  return kind === 'apex_ecosystem' ? 'apex_apps' : 'omniboard';
}

/** Module key the connect CTA for a given integration kind MUST route to. */
export function connectModuleKey(kind: IntegrationKind): string {
  return kind === 'apex_ecosystem' ? APEX_APPS_MODULE_KEY : OMNIBOARD_MODULE_KEY;
}

/**
 * Hard rule guard: returns true if a routing decision violates the ownership
 * canon (APEX ecosystem → OmniBoard, or third-party → APEX Apps MCP).
 */
export function isForbiddenRoute(kind: IntegrationKind, moduleKey: string): boolean {
  if (kind === 'apex_ecosystem' && moduleKey === OMNIBOARD_MODULE_KEY) return true;
  if (kind === 'third_party' && moduleKey === APEX_APPS_MODULE_KEY) return true;
  return false;
}
