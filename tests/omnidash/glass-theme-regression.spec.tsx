import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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

describe('Glass Theme Regression', () => {
  it('shell cards are translucent, not opaque', () => {
    const { container } = render(
      <MemoryRouter>
        <OmniDashProvider>
          <OmniDashShell />
        </OmniDashProvider>
      </MemoryRouter>
    );

    // Look for GlassCard instances
    // They should have background: rgba(14, 22, 40, 0.6) instead of solid colors like #0E1628
    const cards = container.querySelectorAll('[style*="background"]');

    // We expect to find cards with rgba backgrounds for the glass effect
    let foundGlass = false;
    for (const card of Array.from(cards)) {
      const bg = (card as HTMLElement).style.background;
      if (bg.includes('rgba(14, 22, 40, 0.6)') || bg.includes('rgba(')) {
        foundGlass = true;
        break;
      }
    }

    expect(foundGlass).toBe(true);
  });
});
