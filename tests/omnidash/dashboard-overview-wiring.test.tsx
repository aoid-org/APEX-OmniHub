/**
 * DashboardOverview OmniBoard Wiring Tests
 * @module tests/omnidash/dashboard-overview-wiring.test.tsx
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from 'react';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { DashboardOverview } from '../../apps/omnihub-site/src/pages/DashboardOverview';
import { useOmniModal } from '../../src/stores/omniModalStore';

// APEX-DEV: Mock the newly introduced MCP-Client SDK to isolate the UI tests
vi.mock('../../apps/omnihub-site/src/omnihub-gateway/mcp-client', () => ({
  invokeMcpIntent: vi.fn(() => new Promise(() => {})), // Pending promise retains 'QUEUED' state
  queryAgentRegistry: vi.fn(() => Promise.resolve([]))
}));
// Strips Framer animation props before they reach jsdom DOM elements to
// eliminate "React does not recognize the `X` prop" stderr noise.
// Only motion.div is used by DashboardOverview; others are covered defensively.
vi.mock('framer-motion', () => {
  const FRAMER_PROPS = new Set([
    'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
    'animate', 'initial', 'exit', 'variants', 'transition', 'layout',
    'layoutId', 'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
    'dragTransition', 'onDragStart', 'onDragEnd', 'onAnimationStart',
    'onAnimationComplete', 'onHoverStart', 'onHoverEnd',
  ]);
  function strip({ children: _children, ...props }: { children?: ReactNode } & Record<string, unknown>) {
    return Object.fromEntries(Object.entries(props).filter(([k]) => !FRAMER_PROPS.has(k)));
  }
  return {
    motion: {
      div: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <div {...strip({ children, ...props })}>{children}</div>,
      span: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <span {...strip({ children, ...props })}>{children}</span>,
      button: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <button {...strip({ children, ...props })}>{children}</button>,
      ul: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <ul {...strip({ children, ...props })}>{children}</ul>,
      li: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <li {...strip({ children, ...props })}>{children}</li>,
      section: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <section {...strip({ children, ...props })}>{children}</section>,
      aside: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <aside {...strip({ children, ...props })}>{children}</aside>,
      p: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <p {...strip({ children, ...props })}>{children}</p>,
      header: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
        <header {...strip({ children, ...props })}>{children}</header>,
    },
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
    useMotionValue: (v: unknown) => ({ get: () => v, set: vi.fn() }),
    useSpring: (v: unknown) => ({ get: () => v, set: vi.fn() }),
    useTransform: vi.fn(() => ({ get: vi.fn() })),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as Record<string, unknown>),
    useNavigate: vi.fn(),
  };
});

// Stub hasModuleComponent — modules are resolved via Edge Function, not local registry
vi.mock('../../apps/omnihub-site/dashboard/components/moduleComponents', () => ({
  hasModuleComponent: (key: string) =>
    ['omniskills', 'physiomni', 'audits', 'links', 'automations', 'workflows', 'files', 'billing', 'settings'].includes(key),
}));

// Stub Supabase Edge Function (omnilink-port) used by useOmniModuleState
vi.mock('../../apps/omnihub-site/src/lib/supabase', () => ({
  hasSupabaseConfig: false,
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

describe('DashboardOverview - OmniBoard Wiring', () => {
  const mockNavigate = vi.fn();
  const setAppHealth = vi.fn();
  const setEcoAppsVisible = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useOmniModal.setState({
      activeModal: null,
      isOpen: false,
    });
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers UniversalModalEngine oauth flow when clicking a Partial integration tile', () => {
    render(
      <MemoryRouter>
        <DashboardOverview
          demoMode={false}
          appHealth="green"
          setAppHealth={setAppHealth}
          ecoAppsVisible={false}
          setEcoAppsVisible={setEcoAppsVisible}
        />
      </MemoryRouter>,
    );

    // [0] is the context chip in AgentPane; [1] is the AppTile in the apps row
    const qbElements = screen.getAllByText('QuickBooks');
    fireEvent.click(qbElements.at(-1)!);

    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(true);
    expect(modalState.activeModal?.type).toBe('oauth');
    expect(modalState.activeModal?.provider).toBe('QuickBooks');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('triggers UniversalModalEngine oauth flow when clicking a Live integration tile (since integrations do not route internally)', () => {
    render(
      <MemoryRouter>
        <DashboardOverview
          demoMode={false}
          appHealth="green"
          setAppHealth={setAppHealth}
          ecoAppsVisible={false}
          setEcoAppsVisible={setEcoAppsVisible}
        />
      </MemoryRouter>,
    );

    // [0] is the context chip in AgentPane; [1] is the AppTile in the apps row
    const slackElements = screen.getAllByText('Slack');
    fireEvent.click(slackElements.at(-1)!);

    expect(mockNavigate).not.toHaveBeenCalled();
    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(true);
    expect(modalState.activeModal?.type).toBe('oauth');
  });

  it('sim_mode=false queues prompt and does not flip health state', () => {
    render(
      <MemoryRouter>
        <DashboardOverview
          demoMode={false}
          appHealth="green"
          setAppHealth={setAppHealth}
          ecoAppsVisible={false}
          setEcoAppsVisible={setEcoAppsVisible}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Ask APEX Agent'), {
      target: { value: 'Reconcile end-of-day cash and deposit ledger' },
    });
    fireEvent.click(screen.getByText('▶').closest('button') as HTMLButtonElement);

    expect(setAppHealth).toHaveBeenCalledWith('yellow');
  });

  it('sim_mode=true performs deterministic bypass and returns health to green after 2.5s', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <DashboardOverview
          demoMode={true}
          appHealth="green"
          setAppHealth={setAppHealth}
          ecoAppsVisible={false}
          setEcoAppsVisible={setEcoAppsVisible}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('Ask APEX Agent'), {
      target: { value: 'Sync sales, tips, and safe-drop data' },
    });
    fireEvent.click(screen.getByText('▶').closest('button') as HTMLButtonElement);

    expect(setAppHealth).toHaveBeenCalledWith('yellow');
    expect(screen.getByText('SIM_MODE_BYPASS: live Edge Functions skipped.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(setAppHealth).toHaveBeenLastCalledWith('green');
    expect(screen.getByText('SIM_MODE_SUCCESS_TRACE: sync resolved in 2500ms.')).toBeInTheDocument();
  });
});
