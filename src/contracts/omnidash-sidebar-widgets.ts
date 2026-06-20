// Root-package stub; tests mock this via vi.mock('@/contracts/omnidash-sidebar-widgets')
export type OmniDashSidebarWidgetId = string;

export type OmniDashSidebarWidgetLabel = string;
export interface OmniDashSidebarWidget {
  readonly id: string;
  readonly label: string;
  readonly iconIdx: number;
  readonly moduleKey: string | null;
}
export const OMNIDASH_SIDEBAR_WIDGET_COUNT = 0;
export const OMNIDASH_SIDEBAR_WIDGETS: readonly OmniDashSidebarWidget[] = [];
