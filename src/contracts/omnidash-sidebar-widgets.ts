export interface OmniDashSidebarWidget {
  readonly id: string;
  readonly label: string;
  readonly iconIdx: number;
  readonly moduleKey: string;
}

export const OMNIDASH_SIDEBAR_WIDGETS: OmniDashSidebarWidget[] = [];
export const FORBIDDEN_OMNIDASH_SIDEBAR_LABELS: string[] = [];
export const OMNIDASH_SIDEBAR_WIDGET_COUNT = 0;
export function getOmniDashSidebarModuleKey(id: string): string {
  return id;
}
