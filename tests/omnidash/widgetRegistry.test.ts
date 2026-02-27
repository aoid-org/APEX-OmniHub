import { describe, it, expect } from 'vitest';
import { OMNIDASH_WIDGET_REGISTRY, getWidgetForNavKey, getWidgetsByPermission } from '@/omnidash/widgetRegistry';
import { OMNIDASH_NAV_ITEMS } from '@/omnidash/types';

describe('OmniDash Widget Registry', () => {
  it('contains correctly shaped widget definitions', () => {
    for (const [id, widget] of Object.entries(OMNIDASH_WIDGET_REGISTRY)) {
      expect(widget.id).toBe(id);
      expect(widget.label).toBeDefined();
      expect(widget.featureId).toBeDefined();
      expect(widget.component).toBeDefined();
      expect(widget.navKey).toBeDefined();
      expect(['admin', 'user', 'public']).toContain(widget.permissions);
    }
  });

  it('provides 100% coverage for the actual sidebar navigation keys', () => {
    for (const nav of OMNIDASH_NAV_ITEMS) {
      const widget = getWidgetForNavKey(nav.key);
      expect(widget).not.toBeNull();
      expect(widget?.navKey).toBe(nav.key);
    }
  });

  it('filters widgets cleanly by operational permission', () => {
    const adminWidgets = getWidgetsByPermission('admin');
    const userWidgets = getWidgetsByPermission('user');
    
    expect(adminWidgets.length).toBeGreaterThan(0);
    expect(userWidgets.length).toBeGreaterThan(0);
    
    // User request should not yield admin widgets
    const hasAdminWidget = userWidgets.some(w => w.permissions === 'admin');
    expect(hasAdminWidget).toBe(false);
  });
});
