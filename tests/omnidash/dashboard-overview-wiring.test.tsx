/**
 * DashboardOverview OmniBoard Wiring Tests
 * @module tests/omnidash/dashboard-overview-wiring.test.tsx
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { DashboardOverview } from '../../apps/omnihub-site/src/pages/DashboardOverview';
import { useOmniModal } from '../../src/stores/omniModalStore';


vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as Record<string, unknown>),
    useNavigate: vi.fn(),
  };
});

describe.skip('DashboardOverview - OmniBoard Wiring', () => {
  const mockNavigate = vi.fn();
  const setAppHealth = vi.fn();
  const setEcoAppsVisible = vi.fn();

  beforeEach(() => {
    useOmniModal.setState({
      activeModal: null,
      isOpen: false,
    });
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.clearAllMocks();
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

    fireEvent.click(screen.getAllByText('Orchestrator')[0]);

    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(true);
    expect(modalState.activeModal?.type).toBe('oauth');
    expect(modalState.activeModal?.provider).toBe('Orchestrator');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to omniport when clicking a Live integration tile', () => {
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

    fireEvent.click(screen.getAllByText('Fortress')[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/omnidash/omniport');
    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(false);
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

    expect(screen.getByText('QUEUED: Reconcile end-of-day cash and deposit ledger')).toBeInTheDocument();
    expect(setAppHealth).not.toHaveBeenCalled();
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

    vi.advanceTimersByTime(2500);

    expect(setAppHealth).toHaveBeenLastCalledWith('green');
    expect(screen.getByText('SIM_MODE_SUCCESS_TRACE: deterministic sync resolved in 2500ms.')).toBeInTheDocument();
  });
});
