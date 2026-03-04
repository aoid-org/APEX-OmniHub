/**
 * DashboardOverview OmniBoard Wiring Tests
 * @module tests/omnidash/dashboard-overview-wiring.test.tsx
 *
 * Validates the UX interception wiring on the integrated apps grid.
 * Enforces the APEX-TEST AAA pattern.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { DashboardOverview } from '../../apps/omnihub-site/src/pages/DashboardOverview';
import { useOmniModal } from '@/stores/omniModalStore';


// ARRANGE: Mock the router navigation to test Live integration handling
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as Record<string, unknown>),
    useNavigate: vi.fn(),
  };
});

describe('DashboardOverview - OmniBoard Wiring', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    // Reset modal store
    useOmniModal.setState({
      activeModal: null,
      isOpen: false,
    });
    // Reset router mock
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.clearAllMocks();
  });

  it('triggers UniversalModalEngine oauth flow when clicking an unconnected integration (AAA pattern)', () => {
    // ARRANGE: Render the component
    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    // Filter down to the specific Partial integration tile (e.g. Orchestrator)
    const partialAppTile = screen.getByText('Orchestrator').closest('div[draggable="true"]') ?? screen.getByText('Orchestrator').parentElement?.parentElement;
    if (!partialAppTile) throw new Error('Partial app tile not found');

    // ACT: Fire a click event on the partial integration container
    fireEvent.click(partialAppTile);

    // ASSERT: Verify propagation stopped and modal state invoked
    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(true);
    expect(modalState.activeModal?.type).toBe('oauth');
    expect(modalState.activeModal?.provider).toBe('Orchestrator');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to omniport when clicking a live integration (AAA pattern)', () => {
    // ARRANGE: Render the component
    render(
      <MemoryRouter>
        <DashboardOverview />
      </MemoryRouter>
    );

    // Filter down to the specific Live integration tile (e.g. OmniBoard)
    const liveAppTile = screen.getByText('OmniBoard').closest('div[draggable="true"]') ?? screen.getByText('OmniBoard').parentElement?.parentElement;
    if (!liveAppTile) throw new Error('Live app tile not found');

    // ACT: Fire a click event
    fireEvent.click(liveAppTile);

    // ASSERT: Verify navigation routing
    expect(mockNavigate).toHaveBeenCalledWith('/omnidash/omniport');
    const modalState = useOmniModal.getState();
    expect(modalState.isOpen).toBe(false);
  });
});
