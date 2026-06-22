/**
 * Module Action Capabilities Contract
 *
 * Maps (moduleKey, actionId) → whether the action is wired to a real, tested
 * backend pipeline, plus module-specific user copy to show when it is not.
 *
 * Keyed by `${moduleKey}:${actionId}` so we never claim a generic action works
 * across the whole dashboard — "create_workflow" being unsupported in Workflows
 * says nothing about an identically-named action elsewhere.
 *
 * Both the hyphenated baseline ids (moduleData.json) and the underscore/live ids
 * emitted by the omnilink-port resolvers are registered, so a normalized live
 * action resolves to the same capability as its baseline twin and an unsupported
 * action can never silently fall through to trigger-workflow.
 */

export interface ModuleActionCapability {
  /** True ONLY when the action is connected to a real, tested backend pipeline. */
  readonly supported: boolean;
  /** Module-specific copy shown when the action is not connected. */
  readonly copy: string;
}

/**
 * Baseline + live action ids per module. The first array is the baseline
 * (moduleData.json) id set; the second is the live id set emitted by the
 * omnilink-port resolvers (which may differ, e.g. `create_workflow`).
 */
const MODULE_ACTION_IDS: Record<string, readonly string[]> = {
  omniskills:   ['activate-all', 'manage-bundles', 'forge-skill'],
  physiomni:    ['sync-devices', 'export-data', 'provision-device', 'export-telemetry'],
  audits:       ['export-audit', 'run-compliance'],
  links:        ['add-link', 'send-to-omnislate', 'test-all'],
  automations:  ['create-rule', 'view-logs', 'create-automation'],
  workflows:    ['create-workflow', 'import', 'create_workflow', 'trigger_run'],
  files:        ['upload', 'browse', 'upload_file', 'delete_file'],
  billing:      ['manage-plan', 'download-invoices', 'billing-portal'],
  settings:     ['save-settings', 'reset-defaults'],
  dashboard:    ['refresh-status', 'view-incidents'],
  integrations: ['add-integration', 'sync-all'],
  omnitrace:    ['search-traces', 'export-spans'],
  agent:        ['start-session', 'view-history', 'new-session'],
};

/**
 * Module-specific copy shown when a recognised action is not yet wired to a
 * backend pipeline. Never a raw generic string — each module explains, in its
 * own terms, why nothing happened and where the real surface lives.
 */
const MODULE_UNSUPPORTED_COPY: Record<string, string> = {
  omniskills:   'Skill activation is not connected to the OmniSkills pipeline yet.',
  physiomni:    'Device sync and telemetry export are not connected to the device pipeline yet.',
  audits:       'Audit export and compliance runs are not connected to the reporting pipeline yet.',
  links:        'Link context actions run locally in this panel — no link-context backend is connected yet.',
  automations:  'Automation actions are not connected to the workflow engine yet.',
  workflows:    'Workflow actions are not connected to the workflow engine yet.',
  files:        'File operations are not connected to storage actions yet.',
  billing:      'Billing actions are not connected to the billing portal yet.',
  settings:     'Settings are managed directly from the toggles in the Settings panel.',
  dashboard:    'Dashboard actions are not connected to live telemetry yet.',
  integrations: 'Connect an app through OmniBoard — this action is not wired here.',
  omnitrace:    'Trace search and span export are not connected to the tracing backend yet.',
  agent:        'Agent session actions are not connected yet.',
};

const GENERIC_UNSUPPORTED_COPY =
  'This action is not connected to a backend pipeline yet.';

/**
 * Explicit capability map keyed by `${moduleKey}:${actionId}`.
 *
 * Built from MODULE_ACTION_IDS so both baseline and live ids are present. No
 * action is marked `supported: true` until its orchestrator intent handler is
 * verified end-to-end — until then every entry is honestly unsupported and the
 * UI shows the module's own copy instead of calling trigger-workflow.
 */
const CAPABILITY_MAP: ReadonlyMap<string, ModuleActionCapability> = new Map(
  Object.entries(MODULE_ACTION_IDS).flatMap(([moduleKey, actionIds]) => {
    const copy = MODULE_UNSUPPORTED_COPY[moduleKey] ?? GENERIC_UNSUPPORTED_COPY;
    return actionIds.map(
      (actionId) =>
        [`${moduleKey}:${actionId}`, { supported: false, copy }] as const,
    );
  }),
);

/**
 * Resolve the capability for a (moduleKey, actionId) pair. Unknown pairs fall
 * back to the module's tailored copy (or a generic line if the module itself is
 * unknown) and are always treated as unsupported — fail closed, never call the
 * backend for something we can't vouch for.
 */
export function getModuleActionCapability(
  moduleKey: string,
  actionId: string,
): ModuleActionCapability {
  const explicit = CAPABILITY_MAP.get(`${moduleKey}:${actionId}`);
  if (explicit) {
    return explicit;
  }
  const copy = MODULE_UNSUPPORTED_COPY[moduleKey] ?? GENERIC_UNSUPPORTED_COPY;
  return { supported: false, copy };
}

export function isModuleActionSupported(
  moduleKey: string,
  actionId: string,
): boolean {
  return getModuleActionCapability(moduleKey, actionId).supported;
}
