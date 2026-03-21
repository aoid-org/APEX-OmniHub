import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOmniDashAction } from '@/omnidash/useOmniDashAction';
import { useOmniBoard } from '@/stores/omniBoardStore';
import { useOmniModal } from '@/stores/omniModalStore';

vi.mock('@/stores/omniBoardStore', () => ({
  useOmniBoard: vi.fn(),
}));

vi.mock('@/stores/omniModalStore', () => ({
  useOmniModal: {
    getState: vi.fn(() => ({ invoke: vi.fn() })),
  },
}));

describe('useOmniDashAction', () => {
  it('opens module modal (no navigation) when source is "module"', () => {
    const mockNavigate = vi.fn();
    const mockHydrateConnector = vi.fn();
    const mockSetConnectorStatus = vi.fn();
    const mockInvoke = vi.fn();

    vi.mocked(useOmniBoard).mockImplementation((selector) => {
      const state = {
        hydrateConnector: mockHydrateConnector,
        setConnectorStatus: mockSetConnectorStatus,
      };
      return selector(state);
    });

    vi.mocked(useOmniModal.getState).mockReturnValue({ invoke: mockInvoke });

    const { result } = renderHook(() => useOmniDashAction(mockNavigate));

    result.current.dispatch({
      source: 'module',
      appKey: 'fortress',
      provider: 'Fortress',
      label: 'Fortress',
      category: 'security',
      routePath: '/omnidash/fortress',
      dashboardStatus: 'Live',
    });

    // SPA: modules open as modals within OmniDash, never navigate
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalled();
    const invokedConfig = mockInvoke.mock.calls[0][0];
    expect(invokedConfig.type).toBe('module');
    expect(invokedConfig.provider).toBe('Fortress');
  });

  it('dispatches modal invoke when source is "integration"', () => {
    const mockNavigate = vi.fn();
    const mockHydrateConnector = vi.fn();
    const mockSetConnectorStatus = vi.fn();
    const mockInvoke = vi.fn();

    vi.mocked(useOmniBoard).mockImplementation((selector) => {
      const state = {
        hydrateConnector: mockHydrateConnector,
        setConnectorStatus: mockSetConnectorStatus,
      };
      return selector(state);
    });

    vi.mocked(useOmniModal.getState).mockReturnValue({ invoke: mockInvoke });

    const { result } = renderHook(() => useOmniDashAction(mockNavigate));

    result.current.dispatch({
      source: 'integration',
      appKey: 'quickbooks',
      provider: 'QuickBooks',
      label: 'QuickBooks',
      category: 'operations',
      routePath: '/omnidash/integrations/quickbooks',
      dashboardStatus: 'Partial',
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalled();
  });
});
