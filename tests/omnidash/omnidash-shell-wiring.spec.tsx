import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';
import { OmniDashProvider } from '../../apps/omnihub-site/src/providers/OmniDashProvider';
import { MemoryRouter } from 'react-router-dom';
import { useOmniDashAction } from '../../src/omnidash/useOmniDashAction';
import { useOmniModal } from '../../src/stores/omniModalStore';

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// We need to mock supabase properly for the @/ alias within omnihub-site
vi.mock('../../apps/omnihub-site/src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('../../src/omnidash/useOmniDashAction', () => ({
  useOmniDashAction: vi.fn(() => ({ dispatch: vi.fn() })),
}));

vi.mock('../../src/stores/omniModalStore', () => ({
  useOmniModal: vi.fn(() => ({ invoke: vi.fn() })),
}));

vi.mock('../../apps/omnihub-site/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}));

describe('OmniDash Shell Wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOmniModal as unknown).getState = vi.fn(() => ({ invoke: vi.fn() }));
  });

  it('clicking OmniBoard tile routes through the canonical flow and dispatches action instead of no-op', () => {
    const mockDispatch = vi.fn();
    vi.mocked(useOmniDashAction).mockReturnValue({ dispatch: mockDispatch });

    render(
      <MemoryRouter>
        <OmniDashProvider>
          <OmniDashShell />
        </OmniDashProvider>
      </MemoryRouter>
    );

    const omniBoardTile = screen.getByText('OmniBoard');
    fireEvent.click(omniBoardTile);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        appKey: 'omniboard',
      })
    );
  });
});
