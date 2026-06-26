import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockInvoke, mockState } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockState: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: mockInvoke } },
  hasSupabaseConfig: true,
}));

vi.mock('@/hooks/useOmniModuleState', () => ({
  useOmniModuleState: mockState,
  triggerModuleAction: vi.fn(),
}));

import AutomationsModule from '../../apps/omnihub-site/dashboard/components/modules/AutomationsModule';
import BillingModule from '../../apps/omnihub-site/dashboard/components/modules/BillingModule';

function baseState(moduleKey: string) {
  return {
    moduleKey,
    headline: 'Live module',
    stats: [],
    items: [],
    actions: [],
    loading: false,
    error: null,
    stateKind: 'live' as const,
    refetch: vi.fn(),
  };
}

describe('production module actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://apexomnihub.icu', assign: vi.fn() },
    });
  });

  it('AutomationsModule executes exactly one selected live UUID through execute-automation', async () => {
    const refetch = vi.fn();
    mockState.mockReturnValue({
      ...baseState('automations'),
      refetch,
      items: [{ id: '123e4567-e89b-12d3-a456-426614174000', label: 'Daily Lead Sync', status: 'active', detail: 'Trigger: lead.created | Runs: 1/day' }],
      actions: [{ id: 'execute-automation', label: 'Execute Automation', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue({ data: { success: true, action_type: 'notification', result: { sent: true } }, error: null });

    render(<AutomationsModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /daily lead sync/i }));
    fireEvent.click(screen.getByRole('button', { name: /execute automation/i }));

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('execute-automation', {
      body: { automationId: '123e4567-e89b-12d3-a456-426614174000' },
    }));
    expect(refetch).toHaveBeenCalled();
    expect(await screen.findByText(/automation executed successfully/i)).toBeInTheDocument();
  });

  it('AutomationsModule refuses demo/non-UUID item IDs', async () => {
    mockState.mockReturnValue({
      ...baseState('automations'),
      items: [{ id: 'auto-lead', label: 'Demo Lead Sync', status: 'active', detail: 'Trigger: demo | Runs: 1/day' }],
      actions: [{ id: 'execute-automation', label: 'Execute Automation', variant: 'primary' }],
    });

    render(<AutomationsModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /demo lead sync/i }));
    fireEvent.click(screen.getByRole('button', { name: /execute automation/i }));

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(await screen.findByText(/only saved live automations/i)).toBeInTheDocument();
  });

  it('BillingModule opens only the returned Stripe portal URL', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      stats: [{ label: 'Plan', value: 'Pro' }],
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue({ data: { url: 'https://billing.stripe.com/session/test_123' }, error: null });

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('create-billing-portal', {
      body: { returnUrl: 'https://apexomnihub.icu' },
    }));
    expect(window.location.assign).toHaveBeenCalledWith('https://billing.stripe.com/session/test_123');
  });

  it('BillingModule refuses non-Stripe or missing portal URLs', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'billing-portal', label: 'Billing Portal', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue({ data: { url: 'https://billing.example.com/session/test_123' }, error: null });

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /billing portal/i }));

    expect(await screen.findByText(/valid stripe url/i)).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
