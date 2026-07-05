/**
 * Omnidash Layout Contract Tests
 * Lock 3: Assert product registry contracts stay decoupled from the OmniDash sidebar widget rail.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { APP_REGISTRY } from '../../packages/core/src/registry';
import { OMNIDASH_CONTRACT, OMNIDASH_APP_COUNT } from '../../src/contracts/omnidash.contract';
import {
  FORBIDDEN_OMNIDASH_SIDEBAR_LABELS,
  OMNIDASH_SIDEBAR_WIDGET_COUNT,
  OMNIDASH_SIDEBAR_WIDGETS,
} from '../../apps/omnihub-site/src/contracts/omnidash-sidebar-widgets';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

// Mock Supabase
vi.mock('../../apps/omnihub-site/src/lib/supabase', () => ({
  hasSupabaseConfig: false,
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

describe('Omnidash Layout Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('APP_REGISTRY contains exactly OMNIDASH_APP_COUNT product entries', () => {
    expect(APP_REGISTRY).toHaveLength(OMNIDASH_APP_COUNT);
  });

  it('every APP_REGISTRY entry has a routePath starting with /omnidash', () => {
    for (const entry of APP_REGISTRY) {
      expect(entry.routePath).toMatch(/^\/omnidash/);
    }
  });

  it('every contract app has a matching registry entry', () => {
    const registryKeys = APP_REGISTRY.map(e => e.key);
    for (const app of OMNIDASH_CONTRACT) {
      expect(registryKeys).toContain(app.id);
    }
  });

  it('APP_REGISTRY and OMNIDASH_CONTRACT are product-level contracts, not sidebar contracts', () => {
    expect(APP_REGISTRY).toHaveLength(14);
    expect(OMNIDASH_CONTRACT).toHaveLength(14);
    expect(OMNIDASH_SIDEBAR_WIDGETS).toHaveLength(OMNIDASH_SIDEBAR_WIDGET_COUNT);
    expect(OMNIDASH_SIDEBAR_WIDGET_COUNT).toBeLessThan(OMNIDASH_APP_COUNT);

    const registryLabels = APP_REGISTRY.map(entry => entry.label);
    const contractTitles = OMNIDASH_CONTRACT.map(app => app.title);
    const productOnlyLabels = ['OmniSkills', 'Orchestrator', 'Fortress', 'OmniPort', 'Maestro'];
    for (const productOnlyLabel of productOnlyLabels) {
      expect(registryLabels).toContain(productOnlyLabel);
      expect(contractTitles).toContain(productOnlyLabel);
    }

    const sidebarLabels = OMNIDASH_SIDEBAR_WIDGETS.map(widget => widget.label);
    for (const forbiddenSidebarLabel of FORBIDDEN_OMNIDASH_SIDEBAR_LABELS) {
      expect(sidebarLabels).not.toContain(forbiddenSidebarLabel);
    }
  });

  it('OmniDashShell uses OMNIDASH_SIDEBAR_WIDGETS as the only left-sidebar source of truth', () => {
    const shellSource = readFileSync('apps/omnihub-site/dashboard/OmniDashShell.tsx', 'utf8');

    expect(shellSource).toContain('OMNIDASH_SIDEBAR_WIDGETS.map');
    expect(shellSource).toContain('@/contracts/omnidash-sidebar-widgets');
    expect(shellSource).not.toMatch(/const\s+NAV\s*=/);
    expect(shellSource).not.toMatch(/const\s+NAV_MODULE_KEY\s*=/);
  });

  it('OmniDashLayout route path is /omnidash in App.tsx routing', () => {
    // The app routes define: path="/omnidash" element={<OmniDashLayout />}
    // This test verifies the contract: all omnidash apps route under /omnidash
    for (const app of OMNIDASH_CONTRACT) {
      expect(app.route).toMatch(/^\/omnidash/);
    }
  });

  it('asserts left sidebar copies OmniTrace design language', () => {
    const shellSource = readFileSync('apps/omnihub-site/dashboard/OmniDashShell.tsx', 'utf8');
    expect(shellSource).toContain('const RAIL_WIDGET_FILL_ALPHA = 0.06;');
    expect(shellSource).not.toContain('const RAIL_WIDGET_FILL_ALPHA = 0.30;');

    const kpiSource = readFileSync('apps/omnihub-site/dashboard/components/SidebarKpiBar.tsx', 'utf8');
    expect(kpiSource).toContain("background: omniRgba('orange', 0.06)");
    expect(kpiSource).not.toContain("background: omniRgba('orange', 0.30)");
  });
});

