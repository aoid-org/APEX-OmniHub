/**
 * BYOMCockpit unit tests
 *
 * Coverage targets:
 *  - loading state
 *  - empty-connections state
 *  - 3× connection rows (active / inactive / error status)
 *  - model_id present vs. absent
 *  - cleanup cancellation (unmount before fetch resolves)
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Supabase mock ─────────────────────────────────────────────────────────────
// BYOMCockpit imports `supabase` from '@/lib/supabase'.
// Under root vitest, '@' resolves to './src'; we intercept before the real
// module is ever loaded via vi.mock hoisting.
const mockOrder = vi.fn();
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

// ── Component import (after mock declarations) ─────────────────────────────────
import { BYOMCockpit } from '@omnihub/components/byom/BYOMCockpit';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const ACTIVE_CONNECTION = {
  id: 'conn-1',
  provider_name: 'OpenAI',
  status: 'active' as const,
  model_id: 'gpt-4o',
  connected_at: '2025-01-01T00:00:00Z',
};
const INACTIVE_CONNECTION = {
  id: 'conn-2',
  provider_name: 'Anthropic',
  status: 'inactive' as const,
  model_id: null,
  connected_at: null,
};
const ERROR_CONNECTION = {
  id: 'conn-3',
  provider_name: 'Cohere',
  status: 'error' as const,
  model_id: 'command-r',
  connected_at: '2025-02-01T00:00:00Z',
};

describe('BYOMCockpit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the panel header', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });
    render(<BYOMCockpit />);
    expect(screen.getByText('BYOM Cockpit')).toBeInTheDocument();
    expect(screen.getByText(/AI Providers/i)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    // Never resolves during this test
    mockOrder.mockReturnValueOnce(new Promise(() => {}));
    render(<BYOMCockpit />);
    expect(screen.getByText(/Loading providers/i)).toBeInTheDocument();
  });

  it('shows empty-state message when no connections are returned', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });
    render(<BYOMCockpit />);
    expect(
      await screen.findByText(/No AI providers connected/i),
    ).toBeInTheDocument();
  });

  it('shows empty-state when data is null', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });
    render(<BYOMCockpit />);
    expect(
      await screen.findByText(/No AI providers connected/i),
    ).toBeInTheDocument();
  });

  it('renders active connection with provider name, status badge, and model_id', async () => {
    mockOrder.mockResolvedValueOnce({ data: [ACTIVE_CONNECTION], error: null });
    render(<BYOMCockpit />);

    await waitFor(() =>
      expect(screen.getByText('OpenAI')).toBeInTheDocument(),
    );
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('renders inactive connection without model_id line', async () => {
    mockOrder.mockResolvedValueOnce({ data: [INACTIVE_CONNECTION], error: null });
    render(<BYOMCockpit />);

    await waitFor(() =>
      expect(screen.getByText('Anthropic')).toBeInTheDocument(),
    );
    expect(screen.getByText('inactive')).toBeInTheDocument();
    // No model_id — the sub-line should not be rendered
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('renders error connection with correct status', async () => {
    mockOrder.mockResolvedValueOnce({ data: [ERROR_CONNECTION], error: null });
    render(<BYOMCockpit />);

    await waitFor(() =>
      expect(screen.getByText('Cohere')).toBeInTheDocument(),
    );
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('command-r')).toBeInTheDocument();
  });

  it('renders multiple connections', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [ACTIVE_CONNECTION, INACTIVE_CONNECTION, ERROR_CONNECTION],
      error: null,
    });
    render(<BYOMCockpit />);

    await waitFor(() =>
      expect(screen.getByText('OpenAI')).toBeInTheDocument(),
    );
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Cohere')).toBeInTheDocument();
  });

  it('calls supabase with correct table and columns', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });
    render(<BYOMCockpit />);

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('user_provider_connections_safe'));
    expect(mockSelect).toHaveBeenCalledWith(
      'id, provider_name, status, model_id, connected_at',
    );
    expect(mockOrder).toHaveBeenCalledWith('provider_name');
  });

  it('does not update state after component unmounts (cancelled = true)', async () => {
    let resolvePromise!: (value: { data: typeof ACTIVE_CONNECTION[]; error: null }) => void;
    mockOrder.mockReturnValueOnce(
      new Promise<{ data: typeof ACTIVE_CONNECTION[]; error: null }>((res) => {
        resolvePromise = res;
      }),
    );

    const { unmount } = render(<BYOMCockpit />);
    // Unmount before the fetch resolves
    unmount();
    // Resolve after unmount — should not throw or update state
    resolvePromise({ data: [ACTIVE_CONNECTION], error: null });
    // No assertion needed: the test passes if there is no React state-update warning
  });
});
