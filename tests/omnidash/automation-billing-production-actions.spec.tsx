import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { mockInvoke, mockState, mockGetSession } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockState: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: mockInvoke }, auth: { getSession: mockGetSession } },
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
import WorkflowsModule from '../../apps/omnihub-site/dashboard/components/modules/WorkflowsModule';

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
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
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

  it('AutomationsModule executes demo/non-UUID item IDs as simulation', async () => {
    mockState.mockReturnValue({
      ...baseState('automations'),
      items: [{ id: 'auto-lead', label: 'Demo Lead Sync', status: 'active', detail: 'Trigger: demo | Runs: 1/day' }],
      actions: [{ id: 'execute-automation', label: 'Execute Automation', variant: 'primary' }],
    });

    render(<AutomationsModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /demo lead sync/i }));
    fireEvent.click(screen.getByRole('button', { name: /execute automation/i }));

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(await screen.findByText(/\[SIMULATED\] Demo automation "Demo Lead Sync" executed successfully/i)).toBeInTheDocument();
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

  it('BillingModule shows a sign-in prompt with no live session and never calls invoke', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
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

  it('BillingModule shows a sign-in prompt on a 401 response without leaking raw SDK text', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue(mockFunctionsHttpError(401, { code: 'UNAUTHORIZED', message: 'Invalid authentication token' }));

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));

    expect(await screen.findByText(/sign in to manage billing/i)).toBeInTheDocument();
    expect(screen.queryByText(/non-2xx/i)).not.toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('BillingModule routes to Pricing & Payments on BILLING_CUSTOMER_NOT_FOUND', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'billing-portal', label: 'Billing Portal', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue(mockFunctionsHttpError(404, { code: 'BILLING_CUSTOMER_NOT_FOUND', message: 'No Stripe customer is linked to this account yet.' }));

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /billing portal/i }));

    expect(await screen.findByText(/no stripe billing profile is linked/i)).toBeInTheDocument();
    expect(window.location.assign).toHaveBeenCalledWith('/pricing');
  });

  it('BillingModule never leaks the raw non-2xx SDK string for an opaque/unmapped failure', async () => {
    mockState.mockReturnValue({
      ...baseState('billing'),
      actions: [{ id: 'manage-plan', label: 'Manage Plan', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context: undefined } });

    render(<BillingModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /manage plan/i }));

    expect(await screen.findByText(/billing portal is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/non-2xx/i)).not.toBeInTheDocument();
  });

  it('WorkflowsModule renders each item exactly once (SVG pipeline lane only, no duplicate default list row)', () => {
    mockState.mockReturnValue({
      ...baseState('workflows'),
      items: [{ id: '223e4567-e89b-12d3-a456-426614174000', label: 'Onboarding Flow', status: 'active', detail: '2 steps' }],
      actions: [{ id: 'trigger_run', label: 'Trigger Run', variant: 'primary' }],
    });

    render(<WorkflowsModule onClose={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: /onboarding flow/i })).toHaveLength(1);
  });

  it('WorkflowsModule selects a workflow via its pipeline lane and runs it through execute-workflow', async () => {
    const refetch = vi.fn();
    mockState.mockReturnValue({
      ...baseState('workflows'),
      refetch,
      items: [{ id: '223e4567-e89b-12d3-a456-426614174000', label: 'Onboarding Flow', status: 'active', detail: '2 steps' }],
      actions: [{ id: 'trigger_run', label: 'Trigger Run', variant: 'primary' }],
    });
    mockInvoke.mockResolvedValue({
      data: { success: true, status: 'success', steps_total: 2, steps_completed: 2 },
      error: null,
    });

    render(<WorkflowsModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /select workflow onboarding flow/i }));
    fireEvent.click(screen.getByRole('button', { name: /trigger run/i }));

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('execute-workflow', {
      body: { workflowId: '223e4567-e89b-12d3-a456-426614174000' },
    }));
    expect(refetch).toHaveBeenCalled();
    expect(await screen.findByText(/run success: 2\/2 steps completed/i)).toBeInTheDocument();
  });

  it('WorkflowsModule executes demo/non-UUID item IDs for trigger_run as simulation', async () => {
    mockState.mockReturnValue({
      ...baseState('workflows'),
      items: [{ id: 'demo-workflow', label: 'Demo Flow', status: 'active', detail: '3 steps' }],
      actions: [{ id: 'trigger_run', label: 'Trigger Run', variant: 'primary' }],
    });

    render(<WorkflowsModule onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /select workflow demo flow/i }));
    fireEvent.click(screen.getByRole('button', { name: /trigger run/i }));

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(await screen.findByText(/\[SIMULATED\] Demo workflow "Demo Flow" completed successfully/i)).toBeInTheDocument();
  });
});
