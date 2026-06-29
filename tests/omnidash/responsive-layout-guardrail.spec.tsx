/**
 * OmniDash responsive-layout guardrail (post-1511 follow-up).
 *
 * Renders the REAL OmniDashShell and asserts the structural responsive
 * contract that the post-1511 CSS/responsive repair introduced:
 *   - OmniGridTop side columns are shrinkable (minmax(0, …)), never the old
 *     fixed `220px 1fr 220px` that squeezed the center canvas.
 *   - Flanking rails no longer carry an inline 300px literal (width is owned by
 *     the --omni-rail-width CSS var via .omni-sidebar / .omni-right-panel).
 *   - Header icon buttons / avatar use the extracted ose-* classes.
 *   - Integrated Apps Gallery grid uses the responsive ose grid class and stays
 *     display-only (no Connect App CTA, no duplicate Add APEX App).
 *
 * Pure render assertions — no browser/auth required, so this runs in CI as a
 * fast regression lock for the responsive structure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}), getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  },
  hasSupabaseConfig: false,
}));

vi.mock('@/lib/useAuth', () => ({
  useAuth: vi.fn(() => ({ session: null, user: null, isLoading: false })),
}));

vi.mock('@/contracts/omnidash-sidebar-widgets', () => ({
  OMNIDASH_SIDEBAR_WIDGETS: [
    { id: 'omniboard', label: 'OmniBoard', iconIdx: 0, moduleKey: null },
  ],
}));

vi.mock('../../apps/omnihub-site/src/contexts/DemoModeContext', () => ({
  useDemoMode: vi.fn(() => ({
    demoMode: true, autoPilot: false, guardianMode: true,
    setDemoMode: vi.fn(), setAutoPilot: vi.fn(), setGuardianMode: vi.fn(),
  })),
}));

vi.mock('../../apps/omnihub-site/src/stores/notificationStore', () => ({
  useNotificationStore: vi.fn(() => ({ notifications: [], unreadCount: 0, markAllRead: vi.fn() })),
}));

vi.mock('@/omnihub-gateway/mcp-client', () => ({
  queryAgentRegistry: vi.fn().mockResolvedValue([]),
  invokeMcpIntent: vi.fn().mockResolvedValue({ response: '' }),
}));

vi.mock('dashboard/components/designComponents', () => ({
  StatusDot: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  GlassCard: ({ children, style }: { children?: ReactNode; style?: React.CSSProperties }) => <div style={style}>{children}</div>,
  SectionLabel: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('dashboard/components/SystemHealthRow', () => ({ SystemHealthRow: () => <div /> }));
vi.mock('dashboard/components/OmniTraceFeed', () => ({ OmniTraceFeed: () => <div /> }));
vi.mock('dashboard/components/SentinelPanel', () => ({ SentinelPanel: () => <div /> }));

vi.mock('dashboard/DraggableWidget', () => ({
  DraggableWidget: ({ children, id }: { children?: ReactNode; id?: string }) => (
    <div data-testid={id}>{children}</div>
  ),
}));

vi.mock('dashboard/hooks/useLayoutPersistence', () => ({
  useLayoutPersistence: vi.fn(() => ({
    activeNav: 'OmniBoard', setActiveNav: vi.fn(),
    isDark: true, setIsDark: vi.fn(),
    ops: { demo: true, autoPilot: false, guardian: true, live: false }, setOps: vi.fn(),
    panelLayout: 'standard', setPanelLayout: vi.fn(),
    hiddenWidgets: [], toggleWidget: vi.fn(), setGroupHidden: vi.fn(), resetWidgetPositions: vi.fn(),
    hasSeenOnboarding: true, setHasSeenOnboarding: vi.fn(),
  })),
}));

vi.mock('dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(() => ({
    kpi: { flowbills_demos: 0, flowbills_paid_accounts: 0, cash_days_to_cash: 0, ops_sev1_incidents: 0 },
    settings: null, kpiHistory: [], openIncidents: [],
    memoryHealth: null, isLoading: false, error: null, refresh: vi.fn(),
  })),
}));

vi.mock('dashboard/hooks/useViewport', () => ({
  useViewport: vi.fn(() => ({ isMobile: false, isTablet: false, isDesktop: true, width: 1440 })),
}));

vi.mock('dashboard/components/M03Panels', () => ({
  SystemHealthOverview: () => <div />, AgentActivityTimeline: () => <div />,
  GuardianAlertFeed: () => <div />, ManModeReviewQueue: () => <div />,
  OmniRouteTraffic: () => <div />, WorkflowStatusBoard: () => <div />, SystemSparklines: () => <div />,
}));

vi.mock('@/dashboard/components/OmniSpatialHost', () => ({
  OmniSpatialHost: () => <div />, ModuleRenderer: () => <div />,
}));
vi.mock('@/dashboard/components/OmniMobileBottomNav', () => ({ OmniMobileBottomNav: () => <div /> }));
vi.mock('@/dashboard/components/OmniMobileDrawer', () => ({ OmniMobileDrawer: () => <div /> }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() }, Toaster: () => null }));

vi.mock('dashboard/contracts/agentAvatars', () => ({
  AVATAR_PATH_MAP: { Default: '/avatars/avatar-default.png' },
  AGENT_AVATARS: ['avatar-default.png'],
  avatarPath: (f: string) => `/avatars/${f}`,
  agentNameFromAvatarFile: (f: string) => f,
}));

import '../../apps/omnihub-site/src/i18n';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';
import { useViewport } from 'dashboard/hooks/useViewport';

if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}

describe('OmniDash responsive-layout guardrail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const portalRoot = document.createElement('div');
    portalRoot.id = 'omni-portal-root';
    document.body.appendChild(portalRoot);
  });

  it('OmniGridTop side columns are shrinkable (minmax), never fixed 220px 1fr 220px', () => {
    const { container } = render(<OmniDashShell />);
    const grid = container.querySelector('.omni-grid-top') as HTMLElement | null;
    expect(grid).not.toBeNull();
    const cols = grid!.style.gridTemplateColumns;
    expect(cols).toContain('minmax(0, 220px)');
    expect(cols).not.toBe('220px 1fr 220px');
  });

  it('flanking rails carry no inline 300px width literal (CSS var owns rail width)', () => {
    const { container } = render(<OmniDashShell />);
    const sidebar = container.querySelector('.omni-sidebar') as HTMLElement | null;
    expect(sidebar).not.toBeNull();
    // width must NOT be hard-set inline anymore — it is owned by --omni-rail-width.
    expect(sidebar!.style.width).toBe('');
  });

  it('header icon buttons and avatar use extracted ose-* classes', () => {
    const { container } = render(<OmniDashShell />);
    expect(container.querySelectorAll('.ose-icon-button').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('.ose-avatar-button').length).toBe(1);
  });

  it('avatar exposes an accessible name', () => {
    render(<OmniDashShell />);
    expect(screen.getByRole('img', { name: 'User avatar' })).toBeTruthy();
  });

  it('App Gallery renders four display-only Awaiting slots', () => {
    // Owner-approved (PR #1516): four horizontal slots under data-testid
    // "integrated-apps"; the legacy ose grid class was replaced with an inline
    // 4-column grid. See APEX_SURFACE_REGISTRY.md Canonical Layout Law.
    const { container } = render(<OmniDashShell />);
    const grid = container.querySelector('[data-testid="integrated-apps"]');
    expect(grid).not.toBeNull();
    expect(container.querySelectorAll('.ose-integrated-apps-slot').length).toBe(4);
    // Ownership guard: no Connect App CTA, no Connections split, no duplicate Add APEX App.
    expect(screen.queryByText(/Connect App/i)).toBeNull();
    expect(screen.queryByText(/Third-Party Connections/i)).toBeNull();
    expect(screen.queryByText(/Connected APEX Apps/i)).toBeNull();
    expect(screen.getAllByText('Add APEX App')).toHaveLength(1);
  });

  it('mobile viewport renders single-column (no desktop fixed grid)', () => {
    vi.mocked(useViewport).mockReturnValue({
      isMobile: true, isTablet: false, isDesktop: false, width: 393,
    } as ReturnType<typeof useViewport>);
    const { container } = render(<OmniDashShell />);
    const grid = container.querySelector('.omni-grid-top') as HTMLElement | null;
    expect(grid).not.toBeNull();
    expect(grid!.style.gridTemplateColumns).toBe('1fr');
  });
});
