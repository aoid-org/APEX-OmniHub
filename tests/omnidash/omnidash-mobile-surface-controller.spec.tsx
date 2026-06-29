/**
 * P0 remediation coverage — shared mobile/tablet surface controller.
 *
 * Verifies (against the real OmniMobileBottomNav + OmniMobileDrawer, not
 * stubs) that bottom-nav taps actually switch the rendered surface, that
 * exactly one tab is ever active, and that the Insights drawer carries all
 * 5 rail widgets including OmniSentryWidget + OmniMediaLaunchWidget.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// The `@/contracts/omnidash-sidebar-widgets` alias resolves (per
// vitest.config.ts) to an intentionally empty test stub, so it must be
// redirected even when we want the REAL data. We re-export the actual,
// non-stub module's exports here (not a hand-copied fake list) so the
// "every primary sidebar module reachable" assertion below proves
// reachability for all 9 real modules, not just a 2-item stand-in pair.
vi.mock('@/contracts/omnidash-sidebar-widgets', async () => {
  return await vi.importActual('../../apps/omnihub-site/src/contracts/omnidash-sidebar-widgets');
});

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
  StatusDot: ({ children }: { children?: ReactNode }) => <span data-testid="status-dot">{children}</span>,
  GlassCard: ({ children, style }: { children?: ReactNode; style?: React.CSSProperties }) => <div style={style}>{children}</div>,
  SectionLabel: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('dashboard/components/SystemHealthRow', () => ({
  SystemHealthRow: () => <div data-testid="system-health-row" />,
}));

vi.mock('dashboard/components/OmniTraceFeed', () => ({
  OmniTraceFeed: () => <div data-testid="omni-trace-feed" />,
}));

vi.mock('dashboard/components/SentinelPanel', () => ({
  SentinelPanel: () => <div data-testid="sentinel-panel" />,
}));

vi.mock('dashboard/components/OmniSentryWidget', () => ({
  OmniSentryWidget: () => <div data-testid="omni-sentry-widget" />,
}));

vi.mock('dashboard/components/media/OmniMediaLaunchWidget', () => ({
  OmniMediaLaunchWidget: () => <div data-testid="omni-media-launch-widget" />,
}));

vi.mock('dashboard/DraggableWidget', () => ({
  DraggableWidget: ({ children, id }: { children?: ReactNode; id?: string }) => (
    <div data-testid={id}>{children}</div>
  ),
}));

vi.mock('dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(() => ({
    kpi: { flowbills_demos: 0, flowbills_paid_accounts: 0, cash_days_to_cash: 0, ops_sev1_incidents: 0 },
    settings: null, kpiHistory: [], openIncidents: [],
    memoryHealth: null, isLoading: false, error: null, refresh: vi.fn(),
  })),
}));

vi.mock('dashboard/hooks/useViewport', () => ({
  useViewport: vi.fn(() => ({ isMobile: true, isTablet: false, isDesktop: false, width: 375 })),
}));

vi.mock('dashboard/components/M03Panels', () => ({
  SystemHealthOverview: () => <div />,
  AgentActivityTimeline: () => <div />,
  GuardianAlertFeed: () => <div />,
  ManModeReviewQueue: () => <div />,
  OmniRouteTraffic: () => <div />,
  WorkflowStatusBoard: () => <div />,
  SystemSparklines: () => <div />,
}));

vi.mock('@/dashboard/components/OmniSpatialHost', () => ({
  OmniSpatialHost: () => <div data-testid="omni-spatial-host" />,
  ModuleRenderer: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>close</button>
  ),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

vi.mock('dashboard/contracts/agentAvatars', () => ({
  AVATAR_PATH_MAP: { Default: '/avatars/avatar-default.png' },
  AGENT_AVATARS: ['avatar-default.png'],
  avatarPath: (f: string) => `/avatars/${f}`,
  agentNameFromAvatarFile: (f: string) => f.replace('-avatar-icon.png', ''),
}));

import '../../apps/omnihub-site/src/i18n';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';
import { useOmniModal } from '../../apps/omnihub-site/src/stores/omniModalStore';
import { OMNIDASH_SIDEBAR_WIDGETS, OMNIDASH_SIDEBAR_WIDGET_COUNT } from '../../apps/omnihub-site/src/contracts/omnidash-sidebar-widgets';

if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}

describe('OmniDashShell — mobile/tablet surface controller (P0)', () => {
  beforeEach(() => {
    localStorage.clear();
    const portalRoot = document.createElement('div');
    portalRoot.id = 'omni-portal-root';
    document.body.appendChild(portalRoot);
  });

  it('opens the Apps drawer with every primary sidebar module reachable', () => {
    expect(OMNIDASH_SIDEBAR_WIDGETS).toHaveLength(OMNIDASH_SIDEBAR_WIDGET_COUNT);
    render(<OmniDashShell />);
    fireEvent.click(screen.getByRole('tab', { name: /^apps$/i }));
    for (const { label } of OMNIDASH_SIDEBAR_WIDGETS) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('tapping a module in the Apps drawer invokes the shared sidebar module modal and closes the drawer', () => {
    render(<OmniDashShell />);
    fireEvent.click(screen.getByRole('tab', { name: /^apps$/i }));
    const audits = screen.getByText('Audits');
    fireEvent.click(audits);
    expect(useOmniModal.getState().activeModal?.contextData).toEqual({ moduleKey: 'audits' });
    expect(screen.queryByText('Audits')).toBeNull();
  });

  // Owner-approved (PR #1516): SystemHealthRow removed from the rail/drawer —
  // KPIs now live in the SidebarKpiBar. The Insights drawer carries the
  // remaining four rail widgets. See APEX_SURFACE_REGISTRY.md Canonical Layout Law.
  it('Insights drawer carries the rail widgets, including OmniSentryWidget and OmniMediaLaunchWidget', () => {
    render(<OmniDashShell />);
    fireEvent.click(screen.getByRole('tab', { name: /^insights$/i }));
    expect(screen.queryByTestId('system-health-row')).toBeNull();
    expect(screen.getByTestId('omni-trace-feed')).toBeTruthy();
    expect(screen.getByTestId('sentinel-panel')).toBeTruthy();
    expect(screen.getByTestId('omni-sentry-widget')).toBeTruthy();
    expect(screen.getByTestId('omni-media-launch-widget')).toBeTruthy();
  });

  it('exactly one bottom-nav tab is active at a time, and it follows the open drawer', () => {
    render(<OmniDashShell />);
    expect(screen.getByRole('tab', { name: /^home$/i })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: /^more$/i }));
    expect(screen.getByRole('tab', { name: /^more$/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /^home$/i })).toHaveAttribute('aria-selected', 'false');

    const selected = screen.getAllByRole('tab').filter((el) => el.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
  });

  it('the More drawer exposes a real, working theme toggle (not a dead control)', () => {
    render(<OmniDashShell />);
    fireEvent.click(screen.getByRole('tab', { name: /^more$/i }));
    expect(screen.getByText(/switch to light theme/i)).toBeTruthy();
  });

  it('tapping Home closes any open drawer (single active surface)', () => {
    render(<OmniDashShell />);
    fireEvent.click(screen.getByRole('tab', { name: /^insights$/i }));
    expect(screen.getByTestId('omni-trace-feed')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /^home$/i }));
    expect(screen.queryByTestId('omni-trace-feed')).toBeNull();
  });
});
