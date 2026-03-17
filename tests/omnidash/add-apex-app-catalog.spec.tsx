import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OmniDashShell from '../../apps/omnihub-site/dashboard/OmniDashShell';
import { OmniDashProvider } from '../../apps/omnihub-site/src/providers/OmniDashProvider';
import { MemoryRouter } from 'react-router-dom';
import { useOmniModal } from '../../src/stores/omniModalStore';
import { APPS } from '../../apps/omnihub-site/dashboard/components/DashboardOverview/data';

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../../apps/omnihub-site/src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('../../src/stores/omniModalStore', () => ({
  useOmniModal: vi.fn(() => ({ invoke: vi.fn() })),
}));

vi.mock('../../apps/omnihub-site/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}));

describe('Add APEX App Catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOmniModal as unknown).getState = vi.fn(() => ({ invoke: vi.fn() }));
  });

  it('Add APEX App button passes correct APPS from registry to selection modal', () => {
    const mockInvoke = vi.fn();
    vi.mocked(useOmniModal).mockReturnValue({ invoke: mockInvoke } as unknown);

    render(
      <MemoryRouter>
        <OmniDashProvider>
          <OmniDashShell />
        </OmniDashProvider>
      </MemoryRouter>
    );

    const addAppBtn = screen.getByText(/Add APEX App/i);
    fireEvent.click(addAppBtn);

    const invokeCall = mockInvoke.mock.calls[0][0];
    const items = invokeCall.schema.items;

    // The items shown should correspond to APPS
    // Currently, it's hardcoded to OmniSkills, Orchestrator, etc.
    // If the fix is applied, it should map APPS

    // Let's assert that the items match the APPS data source exactly (in number or labels)
    // APPS are filtered and derived from APP_REGISTRY
    const appNames = APPS.map(app => app.name);

    // const renderedAppNames = items.map((i: unknown) => i.label || i.id); // Or extract label if formatted
    // the currently hardcoded list won't match the APPS names perfectly or length
    expect(items.length).toBe(appNames.length);
  });
});
