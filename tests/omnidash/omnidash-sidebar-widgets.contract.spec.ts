import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_OMNIDASH_SIDEBAR_LABELS,
  OMNIDASH_SIDEBAR_WIDGET_COUNT,
  OMNIDASH_SIDEBAR_WIDGETS,
  getOmniDashSidebarModuleKey,
} from '../../apps/omnihub-site/src/contracts/omnidash-sidebar-widgets';

const EXPECTED_LABELS = [
  'OmniBoard',
  'PhysiOmni',
  'Audits',
  'Links',
  'Automations',
  'Workflows',
  'Files',
  'Billing',
  'Settings',
] as const;

const EXPECTED_FORBIDDEN_LABELS = [
  'OmniSkills',
  'Orchestrator',
  'Fortress',
  'OmniPort',
  'Maestro',
  'BYOM',
] as const;

describe('OmniDash sidebar widget contract', () => {
  it('defines exactly 9 sidebar widgets in the locked rail order', () => {
    expect(OMNIDASH_SIDEBAR_WIDGET_COUNT).toBe(9);
    expect(OMNIDASH_SIDEBAR_WIDGETS).toHaveLength(9);
    expect(OMNIDASH_SIDEBAR_WIDGETS.map(widget => widget.label)).toEqual(EXPECTED_LABELS);
  });

  it('keeps forbidden product/platform labels out of the sidebar rail', () => {
    expect(FORBIDDEN_OMNIDASH_SIDEBAR_LABELS).toEqual(EXPECTED_FORBIDDEN_LABELS);

    const sidebarLabels = OMNIDASH_SIDEBAR_WIDGETS.map(widget => widget.label);
    for (const forbiddenLabel of EXPECTED_FORBIDDEN_LABELS) {
      expect(sidebarLabels).not.toContain(forbiddenLabel);
    }
  });

  it('uses non-empty moduleKey for every module widget', () => {
    for (const widget of OMNIDASH_SIDEBAR_WIDGETS) {
      expect(widget.moduleKey).toBeTruthy();
      expect(widget.moduleKey).toBe(widget.id);
    }
  });

  it('resolves moduleKey by widget id', () => {
    for (const widget of OMNIDASH_SIDEBAR_WIDGETS) {
      expect(getOmniDashSidebarModuleKey(widget.id)).toBe(widget.moduleKey);
    }
  });

  it('keeps ids, labels, non-null moduleKeys, and icon indexes unique', () => {
    const ids = OMNIDASH_SIDEBAR_WIDGETS.map(widget => widget.id);
    const labels = OMNIDASH_SIDEBAR_WIDGETS.map(widget => widget.label);
    const moduleKeys = OMNIDASH_SIDEBAR_WIDGETS.flatMap(widget => widget.moduleKey ? [widget.moduleKey] : []);
    const iconIndexes = OMNIDASH_SIDEBAR_WIDGETS.map(widget => widget.iconIdx);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(moduleKeys).size).toBe(moduleKeys.length);
    expect(new Set(iconIndexes).size).toBe(iconIndexes.length);
    expect([...iconIndexes].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
