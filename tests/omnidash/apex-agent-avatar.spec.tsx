import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';
import { OmniDashProvider } from '../../apps/omnihub-site/src/providers/OmniDashProvider';
import { MemoryRouter } from 'react-router-dom';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../../apps/omnihub-site/src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('../../apps/omnihub-site/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}));

describe('Apex Agent Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Agent widget renders ApexAgentAvatar and toggles PersonaModal inline', async () => {
    render(
      <MemoryRouter>
        <OmniDashProvider>
          <OmniDashShell />
        </OmniDashProvider>
      </MemoryRouter>
    );

    const agentImages = screen.getAllByAltText(/avatar/i);
    const avatarImg = agentImages[0];

    // In our implementation, clicking the avatar sets personaOpen=true
    await act(async () => {
      fireEvent.click(avatarImg);
    });

    // After clicking, the PersonaModal should show up.
    expect(screen.getByTestId('persona-modal')).not.toBeNull();
  });
});
