import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockInvoke, mockState, mockGetSession } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockState: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    auth: { getSession: mockGetSession },
  },
  hasSupabaseConfig: true,
}));

function mockFunctionsHttpError(status: number, body: { code: string; message: string }) {
  const context = new Response(JSON.stringify({ ok: false, error: body }), { status });
  return { data: null, error: { message: 'Edge Function returned a non-2xx status code', context } };
}

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

// FunctionsHttpError shape: supabase-js stashes the original Response on `.context`.
function httpError(code: string, status: number) {
  return {
    data: null,
    error: {
      name: 'FunctionsHttpError',
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify({ ok: false, error: { code, message: code } }), { status }),
    },
  };
}

describe('production module actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: a signed-in session is present.
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });
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

  it('BillingModule shows a sign-in prompt and does not invoke when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));

    expect(await screen.findByText(/sign in to manage billing/i)).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('BillingModule maps a 401 to a sign-in prompt and never leaks the raw non-2xx string', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue(httpError('UNAUTHORIZED', 401));

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));

    expect(await screen.findByText(/sign in to manage billing/i)).toBeInTheDocument();
    expect(screen.queryByText(/non-2xx status code/i)).not.toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('BillingModule renders the setup path on BILLING_CUSTOMER_NOT_FOUND', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue(httpError('BILLING_CUSTOMER_NOT_FOUND', 404));

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));

    expect(await screen.findByText(/no stripe billing profile is linked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start pro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start business/i })).toBeInTheDocument();
    expect(screen.queryByText(/non-2xx status code/i)).not.toBeInTheDocument();
  });

  it('BillingModule setup path starts checkout and redirects only to a Stripe checkout URL', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });
    mockInvoke
      .mockResolvedValueOnce(httpError('BILLING_CUSTOMER_NOT_FOUND', 404))
      .mockResolvedValueOnce({ data: { url: 'https://checkout.stripe.com/c/pay/test_123' }, error: null });

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /start pro/i }));

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('create-checkout', {
      body: { tier: 'PRO', skills: [], returnUrl: 'https://apexomnihub.icu' },
    }));
    expect(window.location.assign).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/test_123');
  });

  it('BillingModule setup path refuses a non-Stripe checkout URL', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });
    mockInvoke
      .mockResolvedValueOnce(httpError('BILLING_CUSTOMER_NOT_FOUND', 404))
      .mockResolvedValueOnce({ data: { url: 'https://evil.example.com/pay' }, error: null });

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /start business/i }));

    expect(await screen.findByText(/valid stripe url/i)).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
