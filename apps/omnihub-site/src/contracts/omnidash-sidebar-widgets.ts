export type OmniDashSidebarWidgetId =
  | 'omniboard'
  | 'physiomni'
  | 'audits'
  | 'links'
  | 'automations'
  | 'workflows'
  | 'files'
  | 'billing'
  | 'settings';


export type OmniDashSidebarWidgetLabel =
  | 'OmniBoard'
  | 'PhysiOmni'
  | 'Audits'
  | 'Links'
  | 'Automations'
  | 'Workflows'
  | 'Files'
  | 'Billing'
  | 'Settings';

export interface OmniDashSidebarWidget {
  readonly id: OmniDashSidebarWidgetId;
  readonly label: OmniDashSidebarWidgetLabel;
  readonly iconIdx: number;
  readonly moduleKey: OmniDashSidebarWidgetId | null;
}

export const OMNIDASH_SIDEBAR_WIDGET_COUNT = 9;

export const OMNIDASH_SIDEBAR_WIDGETS = [
  { id: 'omniboard', label: 'OmniBoard', iconIdx: 0, moduleKey: 'omniboard' },
  { id: 'physiomni', label: 'PhysiOmni', iconIdx: 5, moduleKey: 'physiomni' },
  { id: 'audits', label: 'Audits', iconIdx: 1, moduleKey: 'audits' },
  { id: 'links', label: 'Links', iconIdx: 4, moduleKey: 'links' },
  { id: 'automations', label: 'Automations', iconIdx: 7, moduleKey: 'automations' },
  { id: 'workflows', label: 'Workflows', iconIdx: 6, moduleKey: 'workflows' },
  { id: 'files', label: 'Files', iconIdx: 8, moduleKey: 'files' },
  { id: 'billing', label: 'Billing', iconIdx: 3, moduleKey: 'billing' },
  { id: 'settings', label: 'Settings', iconIdx: 2, moduleKey: 'settings' },
] as const satisfies readonly OmniDashSidebarWidget[];

export const FORBIDDEN_OMNIDASH_SIDEBAR_LABELS = [
  'OmniSkills',
  'Orchestrator',
  'Fortress',
  'OmniPort',
  'Maestro',
  'BYOM',
] as const;

export function getOmniDashSidebarModuleKey(
  id: OmniDashSidebarWidgetId,
): OmniDashSidebarWidgetId | null {
  return OMNIDASH_SIDEBAR_WIDGETS.find(widget => widget.id === id)?.moduleKey ?? null;
}
