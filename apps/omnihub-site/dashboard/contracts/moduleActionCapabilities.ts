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
  automations:  ['create-rule', 'view-logs', 'create-automation', 'execute-automation'],
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
 * Built from MODULE_ACTION_IDS so both baseline and live ids are present.
 * Only explicitly verified actions may override the default unsupported entry;
 * every other entry is honestly unsupported and never calls trigger-workflow.
 */
const AUTOMATION_EXECUTE_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Executes one selected saved automation through the authenticated automation runner.',
};

const AUTOMATION_CREATE_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Opens the automation builder to create and persist a new trigger rule.',
};

const BILLING_PORTAL_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Opens the Stripe Customer Portal for this authenticated enterprise account.',
};

const BILLING_MANAGE_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Opens the Stripe Customer Portal to manage subscriptions, payment methods, and billing details.',
};

const BILLING_INVOICES_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Opens the Stripe Customer Portal to view and download past invoices.',
};

const FILES_UPLOAD_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Uploads files directly to tenant-scoped Supabase Storage (omnihub-files or omnimedia-assets).',
};

const FILES_DELETE_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Permanently deletes selected files from the tenant storage prefix in Supabase Storage.',
};

const WORKFLOW_TRIGGER_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Executes the selected orchestration workflow via Supabase Edge Function execute-workflow.',
};

const WORKFLOW_CREATE_CAPABILITY: ModuleActionCapability = {
  supported: true,
  copy: 'Opens the workflow authoring form to create and persist a new pipeline.',
};

const CAPABILITY_MAP: ReadonlyMap<string, ModuleActionCapability> = new Map(
  [
    ...Object.entries(MODULE_ACTION_IDS).flatMap(([moduleKey, actionIds]) => {
      const copy = MODULE_UNSUPPORTED_COPY[moduleKey] ?? GENERIC_UNSUPPORTED_COPY;
      return actionIds.map(
        (actionId) =>
          [`${moduleKey}:${actionId}`, { supported: false, copy }] as const,
      );
    }),
    ['automations:execute-automation', AUTOMATION_EXECUTE_CAPABILITY] as const,
    ['automations:create-automation', AUTOMATION_CREATE_CAPABILITY] as const,
    ['automations:create-rule', AUTOMATION_CREATE_CAPABILITY] as const,
    ['billing:billing-portal', BILLING_PORTAL_CAPABILITY] as const,
    ['billing:manage-plan', BILLING_MANAGE_CAPABILITY] as const,
    ['billing:download-invoices', BILLING_INVOICES_CAPABILITY] as const,
    ['files:upload', FILES_UPLOAD_CAPABILITY] as const,
    ['files:upload_file', FILES_UPLOAD_CAPABILITY] as const,
    ['files:delete_file', FILES_DELETE_CAPABILITY] as const,
    ['workflows:trigger_run', WORKFLOW_TRIGGER_CAPABILITY] as const,
    ['workflows:create_workflow', WORKFLOW_CREATE_CAPABILITY] as const,
    ['workflows:create-workflow', WORKFLOW_CREATE_CAPABILITY] as const,
  ],
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
