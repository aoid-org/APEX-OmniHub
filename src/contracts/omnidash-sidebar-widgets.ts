// STUB for vitest. vi.mock intercepts this.
export type OmniDashSidebarWidgetId = string;
export type OmniDashSidebarWidgetLabel = string;
export interface OmniDashSidebarWidget {
  readonly id: OmniDashSidebarWidgetId;
  readonly label: OmniDashSidebarWidgetLabel;
  readonly iconIdx: number;
  readonly moduleKey: OmniDashSidebarWidgetId;
}

export const OMNIDASH_SIDEBAR_WIDGETS: OmniDashSidebarWidget[] = [];
export const FORBIDDEN_OMNIDASH_SIDEBAR_LABELS: OmniDashSidebarWidgetLabel[] = [];
export const OMNIDASH_SIDEBAR_WIDGET_COUNT = 0;
export function getOmniDashSidebarModuleKey(id: OmniDashSidebarWidgetId): OmniDashSidebarWidgetId {
  return id;
}
