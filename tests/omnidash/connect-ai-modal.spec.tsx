import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';
import { OmniDashProvider } from '../../apps/omnihub-site/src/providers/OmniDashProvider';
import { MemoryRouter } from 'react-router-dom';
import { useOmniDashAction } from '../../src/omnidash/useOmniDashAction';
import { useOmniModal } from '../../src/stores/omniModalStore';

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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

describe('Connect AI Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOmniModal as unknown).getState = vi.fn(() => ({ invoke: vi.fn() }));
  });

  it('Connect AI button dispatches real connection intent for LLM provider', () => {
    const mockDispatch = vi.fn();
    vi.mocked(useOmniDashAction).mockReturnValue({ dispatch: mockDispatch });

    render(
      <MemoryRouter>
        <OmniDashProvider>
          <OmniDashShell />
        </OmniDashProvider>
      </MemoryRouter>
    );

    const connectAIBtn = screen.getByText('Connect AI');
    fireEvent.click(connectAIBtn);

    // Assert that we don't just open the hardcoded generic model-selection modal,
    // but instead dispatch an intent with dashboardStatus: 'Partial' (which triggers OAuth modal)
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        appKey: expect.stringMatching(/omniskills|openai|anthropic/), // Assuming OmniSkills or a provider
        dashboardStatus: 'Partial',
      })
    );
  });
});
