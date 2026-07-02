import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';

const { invokeMock, queryAgentRegistryMock, byomInvokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  queryAgentRegistryMock: vi.fn().mockResolvedValue([]),
  byomInvokeMock: vi.fn(),
}));

vi.mock('@/stores/omniModalStore', () => {
  const useOmniModal = () => ({ invoke: invokeMock });
  useOmniModal.getState = () => ({ invoke: invokeMock });
  return { useOmniModal };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}), getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
    functions: { invoke: byomInvokeMock },
  },
  hasSupabaseConfig: false,
}));

vi.mock('@/lib/useAuth', () => ({
  useAuth: vi.fn(() => ({ session: null, user: null, isLoading: false })),
}));

vi.mock('@/contracts/omnidash-sidebar-widgets', () => ({
  OMNIDASH_SIDEBAR_WIDGETS: [
    { id: 'omniboard', label: 'OmniBoard', iconIdx: 0, moduleKey: 'omniboard' },
    { id: 'pipeline', label: 'Pipeline', iconIdx: 1, moduleKey: 'pipeline' },
    { id: 'billing', label: 'Billing', iconIdx: 2, moduleKey: 'billing' },
  ],
}));

vi.mock('../../apps/omnihub-site/src/contexts/DemoModeContext', () => ({
  useDemoMode: vi.fn(() => ({
    demoMode: true, autoPilot: false, guardianMode: true,
    setDemoMode: vi.fn(), setAutoPilot: vi.fn(), setGuardianMode: vi.fn(),
  })),
}));

vi.mock('../../apps/omnihub-site/src/stores/notificationStore', () => ({
  useNotificationStore: vi.fn((selector?: (state: any) => unknown) => {
    const state = { notifications: [], getUnreadCount: () => 0, markAllAsRead: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/omnihub-gateway/mcp-client', () => ({
  queryAgentRegistry: queryAgentRegistryMock,
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
vi.mock('dashboard/DraggableWidget', () => ({ DraggableWidget: ({ children, id }: { children?: ReactNode; id?: string }) => <div data-testid={id}>{children}</div> }));
vi.mock('dashboard/hooks/useLayoutPersistence', () => ({
  useLayoutPersistence: vi.fn(() => ({
    activeNav: 'Home', setActiveNav: vi.fn(), isDark: true, setIsDark: vi.fn(),
    ops: { demo: true, autoPilot: false, guardian: true, live: false }, setOps: vi.fn(),
    panelLayout: 'standard', setPanelLayout: vi.fn(), hiddenWidgets: [], toggleWidget: vi.fn(),
    setGroupHidden: vi.fn(), resetWidgetPositions: vi.fn(), hasSeenOnboarding: true, setHasSeenOnboarding: vi.fn(),
  })),
}));
vi.mock('dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(() => ({
    kpi: { flowbills_demos: 0, flowbills_paid_accounts: 0, cash_days_to_cash: 0, ops_sev1_incidents: 0 },
    settings: null, kpiHistory: [], openIncidents: [], memoryHealth: null, isLoading: false, error: null, refresh: vi.fn(),
  })),
}));
vi.mock('dashboard/hooks/useViewport', () => ({ useViewport: vi.fn(() => ({ isMobile: false, isTablet: false, isDesktop: true, width: 1440 })) }));
vi.mock('dashboard/components/M03Panels', () => ({
  SystemHealthOverview: () => <div />, AgentActivityTimeline: () => <div />, GuardianAlertFeed: () => <div />,
  ManModeReviewQueue: () => <div />, OmniRouteTraffic: () => <div />, WorkflowStatusBoard: () => <div />, SystemSparklines: () => <div />,
}));
vi.mock('@/dashboard/components/OmniSpatialHost', () => ({ OmniSpatialHost: () => <div />, ModuleRenderer: () => <div /> }));
vi.mock('@/dashboard/components/OmniMobileBottomNav', () => ({ OmniMobileBottomNav: () => <div /> }));
vi.mock('@/dashboard/components/OmniMobileDrawer', () => ({ OmniMobileDrawer: () => <div /> }));
vi.mock('@/dashboard/components/media/GlobalMediaDock', () => ({ GlobalMediaDock: () => <div /> }));
vi.mock('@/dashboard/components/media/OmniMediaLaunchWidget', () => ({ OmniMediaLaunchWidget: () => <div /> }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() }, Toaster: () => null }));
vi.mock('dashboard/contracts/agentAvatars', () => ({
  AVATAR_PATH_MAP: { Default: '/avatars/avatar-default.png' }, AGENT_AVATARS: ['avatar-default.png'],
  avatarPath: (f: string) => `/avatars/${f}`, agentNameFromAvatarFile: (f: string) => f,
}));
vi.mock('../../apps/omnihub-site/src/components/byom/ConnectAiAuthModal', () => ({
  ConnectAiAuthModal: ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => (
    isOpen ? <div role="dialog" aria-label="Connect AI credentials"><button onClick={onSuccess}>Complete BYOM</button><button onClick={onClose}>Close BYOM</button></div> : null
  ),
}));

import '../../apps/omnihub-site/src/i18n';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';

if (typeof Element.prototype.scrollIntoView === 'undefined') Element.prototype.scrollIntoView = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  document.body.innerHTML = '<div id="omni-portal-root"></div>';
});

describe('OmniDash header search', () => {
  it('renders a real accessible search input and focuses it with the truthful keyboard shortcut', async () => {
    render(<OmniDashShell />);
    const search = screen.getByRole('searchbox', { name: 'Search OmniHub' });
    expect(search).toBeTruthy();
    expect(screen.getByText(/⌘K|Ctrl\+K/)).toBeTruthy();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(document.activeElement).toBe(search));
  });

  it('filters real OmniDash registry surfaces and opens the selected module by keyboard', async () => {
    render(<OmniDashShell />);
    const search = screen.getByRole('searchbox', { name: 'Search OmniHub' });
    fireEvent.change(search, { target: { value: 'pipeline' } });
    expect(await screen.findByRole('option', { name: /Pipeline/ })).toBeTruthy();

    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'omnidash-search-pipeline',
      title: 'Pipeline',
      contextData: { moduleKey: 'pipeline' },
    })));
  });

  it('opens a clicked result, supports Escape close, and shows an empty state for unknown queries', async () => {
    render(<OmniDashShell />);
    const search = screen.getByRole('searchbox', { name: 'Search OmniHub' });
    fireEvent.change(search, { target: { value: 'billing' } });
    fireEvent.click(await screen.findByRole('option', { name: /Billing/ }));
    expect(invokeMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'omnidash-search-billing' }));

    fireEvent.change(search, { target: { value: 'not-a-real-surface' } });
    expect(await screen.findByText(/No OmniDash surfaces match/i)).toBeTruthy();
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByText(/No OmniDash surfaces match/i)).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Search OmniHub' })).toBeTruthy();
  });

  it('does not call agent registry or BYOM credential routes during search', () => {
    render(<OmniDashShell />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search OmniHub' }), { target: { value: 'billing' } });
    expect(queryAgentRegistryMock).not.toHaveBeenCalled();
    expect(byomInvokeMock).not.toHaveBeenCalled();
  });
});
