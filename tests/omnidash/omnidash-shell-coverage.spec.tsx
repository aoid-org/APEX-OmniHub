/**
 * OmniDashShell coverage test
 * Renders the shell with mocked dependencies to cover new code lines
 * (NavItem border shorthand + EcosystemWidget reverts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';

// ── Mocks (must be declared before any imports that use them) ──────────────────

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
    { id: 'pipeline', label: 'Pipeline', iconIdx: 1, moduleKey: 'pipeline' },
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

vi.mock('dashboard/DraggableWidget', () => ({
  DraggableWidget: ({ children, id }: { children?: ReactNode; id?: string }) => (
    <div data-testid={id}>{children}</div>
  ),
}));

vi.mock('dashboard/hooks/useLayoutPersistence', () => ({
  useLayoutPersistence: vi.fn(() => ({
    activeNav: 'OmniBoard',
    setActiveNav: vi.fn(),
    isDark: true,
    setIsDark: vi.fn(),
    ops: { demo: true, autoPilot: false, guardian: true, live: false },
    setOps: vi.fn(),
    panelLayout: 'standard',
    setPanelLayout: vi.fn(),
    hiddenWidgets: [],
    toggleWidget: vi.fn(),
    resetWidgetPositions: vi.fn(),
    hasSeenOnboarding: true,
    setHasSeenOnboarding: vi.fn(),
  })),
}));

vi.mock('dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(() => ({
    kpi: {
      flowbills_demos: 0,
      flowbills_paid_accounts: 0, cash_days_to_cash: 0, ops_sev1_incidents: 0,
    },
    settings: null, kpiHistory: [], openIncidents: [],
    memoryHealth: null, isLoading: false, error: null, refresh: vi.fn(),
  })),
}));

vi.mock('dashboard/hooks/useViewport', () => ({
  useViewport: vi.fn(() => ({ isMobile: false, isTablet: false, isDesktop: true, width: 1440 })),
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

vi.mock('@/dashboard/components/OmniMobileBottomNav', () => ({
  OmniMobileBottomNav: () => <div data-testid="mobile-bottom-nav" />,
}));

vi.mock('@/dashboard/components/OmniMobileDrawer', () => ({
  OmniMobileDrawer: () => <div data-testid="mobile-drawer" />,
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

// ── Import after all mocks are declared ──────────────────────────────────────
// The shell renders OmniMediaLaunchWidget → OmniMediaGallery, which goes through
// the REAL useAppTranslation hook (i18n.exists / t). Initialize the production
// i18n instance with the real locale bundles — no mock, the actual translation
// system runs in the test exactly as it does in the app.
import '../../apps/omnihub-site/src/i18n';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';
import { useViewport } from 'dashboard/hooks/useViewport';
import { useLayoutPersistence } from 'dashboard/hooks/useLayoutPersistence';

// jsdom lacks scrollIntoView
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}

describe('OmniDashShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a portal root for OmniSpatialHost
    const portalRoot = document.createElement('div');
    portalRoot.id = 'omni-portal-root';
    document.body.appendChild(portalRoot);
  });

  it('renders the dashboard shell without crashing', () => {
    const { container } = render(<OmniDashShell />);
    expect(container).toBeTruthy();
  });

  it('renders NavItems from OMNIDASH_SIDEBAR_WIDGETS', () => {
    render(<OmniDashShell />);
    expect(screen.getByText('OmniBoard')).toBeTruthy();
    expect(screen.getByText('Pipeline')).toBeTruthy();
  });

  it('renders EcosystemWidget with Add APEX App button', () => {
    render(<OmniDashShell />);
    expect(screen.getByText('Add APEX App')).toBeTruthy();
  });

  it('renders APEX Ecosystem section label', () => {
    render(<OmniDashShell />);
    expect(screen.getByText('APEX Ecosystem')).toBeTruthy();
  });

  it('renders mobile drawer button when not on desktop', () => {
    vi.mocked(useViewport).mockReturnValueOnce({
      isMobile: true, isTablet: false, isDesktop: false, width: 375,
    } as ReturnType<typeof useViewport>);
    render(<OmniDashShell />);
    expect(screen.getByLabelText('Open insights panel')).toBeTruthy();
  });

  it('renders mobile bottom nav and drawer when not on desktop', () => {
    vi.mocked(useViewport).mockReturnValueOnce({
      isMobile: true, isTablet: false, isDesktop: false, width: 375,
    } as ReturnType<typeof useViewport>);
    render(<OmniDashShell />);
    expect(screen.getByTestId('mobile-bottom-nav')).toBeTruthy();
    expect(screen.getByTestId('mobile-drawer')).toBeTruthy();
  });

  it('renders reversed layout sidebar when panelLayout is reversed', () => {
    vi.mocked(useLayoutPersistence).mockReturnValueOnce({
      activeNav: 'OmniBoard',
      setActiveNav: vi.fn(),
      isDark: true,
      setIsDark: vi.fn(),
      ops: { demo: true, autoPilot: false, guardian: true, live: false },
      setOps: vi.fn(),
      panelLayout: 'reversed',
      setPanelLayout: vi.fn(),
      hiddenWidgets: [],
      toggleWidget: vi.fn(),
      setGroupHidden: vi.fn(),
      resetWidgetPositions: vi.fn(),
      hasSeenOnboarding: true,
      setHasSeenOnboarding: vi.fn(),
    } as ReturnType<typeof useLayoutPersistence>);
    render(<OmniDashShell />);
    // Both nav items should still render (sidebar renders the nav)
    expect(screen.getByText('OmniBoard')).toBeTruthy();
    expect(screen.getByText('Pipeline')).toBeTruthy();
  });
});
