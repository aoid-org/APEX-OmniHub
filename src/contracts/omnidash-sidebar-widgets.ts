// STUB for vitest. vi.mock intercepts this.
export const OMNIDASH_SIDEBAR_WIDGETS = [];
export const FORBIDDEN_OMNIDASH_SIDEBAR_LABELS = [];
export const OMNIDASH_SIDEBAR_WIDGET_COUNT = 0;
export type OmniDashSidebarWidgetId = string;
export type OmniDashSidebarWidgetLabel = string;
export interface OmniDashSidebarWidget {
  readonly id: OmniDashSidebarWidgetId;
  readonly label: OmniDashSidebarWidgetLabel;
  readonly iconIdx: number;
  readonly moduleKey: OmniDashSidebarWidgetId;
}
export function getOmniDashSidebarModuleKey(id: OmniDashSidebarWidgetId): OmniDashSidebarWidgetId {
  return id;
}
