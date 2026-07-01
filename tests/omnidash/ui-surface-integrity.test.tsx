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
    
    expect(screen.getByText('Events Tracked (Simulated)')).toBeTruthy();
    expect(screen.getByText('System Health (Simulated)')).toBeTruthy();
    expect(screen.getByText('Guardian Loops (Simulated)')).toBeTruthy();
    expect(screen.getByText('Stale Checks (Simulated)')).toBeTruthy();
  });

  it('explicitly labels OmniTraceFeed as Demo (Simulated)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    render(<OmniTraceFeed />);
    
    // The feed starts in 'CONNECTING' state which falls back to Demo if URL/Key is missing in test env
    expect(await screen.findByText('Demo (Simulated)')).toBeTruthy();
    vi.unstubAllEnvs();
  });

});
