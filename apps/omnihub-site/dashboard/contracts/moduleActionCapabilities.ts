export type CapabilityStatus = 'implemented' | 'backend_unavailable' | 'requires_integration';

export interface ModuleActionCapability {
  readonly status: CapabilityStatus;
  readonly message?: string;
}

export const MODULE_ACTION_CAPABILITIES: Record<string, ModuleActionCapability> = {
  // Audits
  'export-audit': { status: 'backend_unavailable', message: 'Audit export is not connected to a live audit backend yet.' },
  'run-compliance': { status: 'backend_unavailable', message: 'Audit backend is not connected yet.' },
  
  // Automations
  'create-rule': { status: 'backend_unavailable', message: 'Automation authoring is not available in production yet.' },
  'view-logs': { status: 'backend_unavailable', message: 'Automation logs are not available in production yet.' },
  
  // Workflows
  'create-workflow': { status: 'backend_unavailable', message: 'Workflow authoring is not available in production yet.' },
  'trigger-run': { status: 'backend_unavailable', message: 'Workflow runner is not configured for this action yet.' },
  
  // Files
  'upload-file': { status: 'requires_integration', message: 'Requires a connected APEX Storage Provider.' },
  'delete-file': { status: 'requires_integration', message: 'Requires a connected APEX Storage Provider.' },
  
  // Billing
  'manage-plan': { status: 'requires_integration', message: 'Billing portal is not connected for this workspace.' },
  'billing-portal': { status: 'requires_integration', message: 'Billing portal is not connected for this workspace.' },
  
  // Links
  'test-all': { status: 'backend_unavailable', message: 'Link health checks are not connected yet.' },
};

export function getActionCapability(actionId: string): ModuleActionCapability {
  return MODULE_ACTION_CAPABILITIES[actionId] ?? { status: 'implemented' };
}
