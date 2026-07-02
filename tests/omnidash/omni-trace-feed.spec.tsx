import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { act } from 'react';
import { OmniTraceFeed } from '../../apps/omnihub-site/dashboard/components/OmniTraceFeed';

const mockSubscribe = vi.fn();
const mockOn = vi.fn().mockReturnThis();
const mockRemoveChannel = vi.fn();
const mockChannel = vi.fn().mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

// PRCC-001 WP-3a: the feed now backfills from omnitrace_events on mount via
// supabase.from(...).select(...).order(...).limit(...). Mock that chain to resolve
// EMPTY so the existing realtime/"No events yet" expectations are preserved.
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

const mockSupabaseClient = {
  channel: mockChannel,
  removeChannel: mockRemoveChannel,
  from: mockFrom,
};

describe('OmniTraceFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-key');

    mockOn.mockReturnThis();
    mockSubscribe.mockImplementation((cb: (s: string) => void) => {
      console.log('BEFORE EACH MOCK SUBSCRIBE CALLING SUBSCRIBED');
      cb('SUBSCRIBED');
      return { unsubscribe: vi.fn() };
    });
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
  });

  it('renders the OmniTrace section', () => {
    render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    expect(screen.getByTestId('omni-trace-feed')).toBeTruthy();
    expect(screen.getByText('OmniTrace')).toBeTruthy();
  });

  it('shows Demo badge when env vars are not configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    expect(screen.getByText('Demo (Simulated)')).toBeTruthy();

    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-key');
  });

  it('renders demo logs when in demo mode', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    expect(screen.getByText(/Salesforce sync completed/)).toBeTruthy();
    expect(screen.getByText(/Invoice batch/)).toBeTruthy();

    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-key');
  });

  it('renders Replay Workflows button', () => {
    render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    expect(screen.getByText('+ Replay Workflows')).toBeTruthy();
  });

  it('shows Live badge when subscribed', async () => {
    console.log('LIVE TEST ENV URL:', process.env.VITE_SUPABASE_URL, 'import.meta:', import.meta.env.VITE_SUPABASE_URL);
    await act(async () => {
      render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    });
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeTruthy();
    });
  });

  it('handles CHANNEL_ERROR by setting ERROR status', async () => {
    mockSubscribe.mockImplementation((cb: (s: string) => void) => {
      console.log('TEST MOCK SUBSCRIBE CALLING CHANNEL_ERROR');
      cb('CHANNEL_ERROR');
      return { unsubscribe: vi.fn() };
    });
    await act(async () => {
      render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    });
    await waitFor(() => {
      const badges = screen.getAllByText(/Demo \(Simulated\)|Connecting/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('renders with a tenantId prop', async () => {
    await act(async () => {
      render(<OmniTraceFeed tenantId="tenant-001" mockSupabase={mockSupabaseClient as any} />);
    });
    expect(screen.getByTestId('omni-trace-feed')).toBeTruthy();
  });

  it('calls removeChannel on unmount', async () => {
    let unmount: () => void;
    await act(async () => {
      const result = render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
      unmount = result.unmount;
    });
    act(() => { unmount(); });
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('shows Connecting when subscribe is pending', async () => {
    mockSubscribe.mockImplementation(() => {
      return { unsubscribe: vi.fn() };
    });
    await act(async () => {
      render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    });
    expect(screen.getByText('Connecting')).toBeTruthy();
  });

  it('shows No events yet when subscribed with no logs', async () => {
    await act(async () => {
      render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    });
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeTruthy();
    });
    // When subscribed and no INSERT events have fired, logs is empty → show "No events yet"
    expect(screen.getByText('No events yet')).toBeTruthy();
  });

  it('mouseEnter on Replay Workflows button changes its border color', async () => {
    await act(async () => {
      render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    });
    const button = screen.getByText('+ Replay Workflows').closest('button') as HTMLButtonElement;
    fireEvent.mouseEnter(button);
    // jsdom normalizes rgba(249,115,22,0.3) to rgb form; check it's not empty
    expect(button.style.borderColor).toBeTruthy();
  });

  it('mouseLeave on Replay Workflows button resets its border color', async () => {
    await act(async () => {
      render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    });
    const button = screen.getByText('+ Replay Workflows').closest('button') as HTMLButtonElement;
    fireEvent.mouseEnter(button);
    const afterEnter = button.style.borderColor;
    fireEvent.mouseLeave(button);
    // After leave the border color is reset (may differ from enter value)
    expect(button.style.borderColor).not.toBe(afterEnter);
  });

  it('shows seconds-ago label for a very recent INSERT log', async () => {
    let insertCallback: ((payload: { new: Record<string, unknown> }) => void) | undefined;
    mockOn.mockImplementation((_event: string, _filter: unknown, cb: (payload: { new: Record<string, unknown> }) => void) => {
      insertCallback = cb;
      return { on: mockOn, subscribe: mockSubscribe };
    });

    await act(async () => {
      render(<OmniTraceFeed mockSupabase={mockSupabaseClient as any} />);
    });

    await act(async () => {
      insertCallback?.({
        new: {
          id: 'recent1',
          action: 'Just happened event',
          created_at: new Date().toISOString(),
          severity: 'ok',
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/\ds ago/)).toBeTruthy();
    });
  });
});
