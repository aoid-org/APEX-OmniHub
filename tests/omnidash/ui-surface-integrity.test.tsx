import { expect, describe, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';


// Import components directly to verify their rendered output
import { SystemHealthRow } from '../../apps/omnihub-site/dashboard/components/SystemHealthRow';
import OmniTraceFeed from '../../apps/omnihub-site/dashboard/components/OmniTraceFeed';

// Mock matchMedia for components that might use it
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('OmniDash UI Surface Integrity', () => {
  it('explicitly labels Metric Cards as (Simulated) when in demo mode', () => {
    const mockKpi = {
      flowbills_demos: 0,
      flowbills_paid_accounts: 0,
      cash_days_to_cash: 0,
      ops_sev1_incidents: 0
    };

    render(<SystemHealthRow demoMode={true} kpi={mockKpi} />);
    
    expect(screen.getByText('FlowBills Demos (Simulated)')).toBeTruthy();
    expect(screen.getByText('System Health (Simulated)')).toBeTruthy();
    expect(screen.getByText('FlowBills Paid Accounts (Simulated)')).toBeTruthy();
    expect(screen.getByText('Stale Checks (Simulated)')).toBeTruthy();
  });

  it('shows OmniTraceFeed as unavailable, never as sample data, when it cannot load', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    render(<OmniTraceFeed />);

    // A missing URL/Key puts the feed in the error state instead of showing sample events
    expect(await screen.findByText('Unavailable')).toBeTruthy();
    expect(screen.queryByText('Demo (Simulated)')).toBeNull();
    vi.unstubAllEnvs();
  });

});
