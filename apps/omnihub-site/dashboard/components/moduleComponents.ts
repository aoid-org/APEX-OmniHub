/**
 * moduleComponents — Module key lookup for OmniDash.
 *
 * Separated from ModuleRenderer.tsx to satisfy react-refresh/only-export-components.
 * OWNED BY: APEX Business Systems Ltd.
 */

const MODULE_KEYS: ReadonlySet<string> = new Set([
  'omniskills',
  'physiomni',
  'audits',
  'links',
  'automations',
  'workflows',
  'files',
  'billing',
  'settings',
  'translation',
]);

/** Returns true when a lazy-loaded module component exists for the given key. */
export function hasModuleComponent(moduleKey: string): boolean {
  return MODULE_KEYS.has(moduleKey);
}
