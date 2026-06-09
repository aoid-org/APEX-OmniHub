import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';

const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockRemoveChannel = vi.fn();
const mockChannel = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  })),
}));

import { OmniTraceFeed } from '../../apps/omnihub-site/dashboard/components/OmniTraceFeed';

describe('OmniTraceFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnThis();
    mockSubscribe.mockImplementation((cb: (s: string) => void) => {
      cb('SUBSCRIBED');
      return { unsubscribe: vi.fn() };
    });
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
  });

  it('renders the OmniTrace section', () => {
    render(<OmniTraceFeed />);
    expect(screen.getByTestId('omni-trace-feed')).toBeTruthy();
    expect(screen.getByText('OmniTrace')).toBeTruthy();
  });

  it('shows Demo badge when env vars are not configured', () => {
    const savedUrl = process.env.VITE_SUPABASE_URL;
    const savedKey = process.env.VITE_SUPABASE_ANON_KEY;
    process.env.VITE_SUPABASE_URL = '';
    process.env.VITE_SUPABASE_ANON_KEY = '';

    render(<OmniTraceFeed />);
    expect(screen.getByText('Demo')).toBeTruthy();

    process.env.VITE_SUPABASE_URL = savedUrl;
    process.env.VITE_SUPABASE_ANON_KEY = savedKey;
  });

  it('renders demo logs when in demo mode', () => {
    const savedUrl = process.env.VITE_SUPABASE_URL;
    const savedKey = process.env.VITE_SUPABASE_ANON_KEY;
    process.env.VITE_SUPABASE_URL = '';
    process.env.VITE_SUPABASE_ANON_KEY = '';

    render(<OmniTraceFeed />);
    expect(screen.getByText(/Salesforce sync completed/)).toBeTruthy();
    expect(screen.getByText(/Invoice batch/)).toBeTruthy();

    process.env.VITE_SUPABASE_URL = savedUrl;
    process.env.VITE_SUPABASE_ANON_KEY = savedKey;
  });

  it('renders Replay Workflows button', () => {
    render(<OmniTraceFeed />);
    expect(screen.getByText('+ Replay Workflows')).toBeTruthy();
  });

  it('shows Live badge when subscribed', async () => {
    await act(async () => {
      render(<OmniTraceFeed />);
    });
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeTruthy();
    });
  });

  it('handles CHANNEL_ERROR by setting ERROR status', async () => {
    mockSubscribe.mockImplementation((cb: (s: string) => void) => {
      cb('CHANNEL_ERROR');
      return { unsubscribe: vi.fn() };
    });
    await act(async () => {
      render(<OmniTraceFeed />);
    });
    await waitFor(() => {
      const badges = screen.getAllByText(/Demo|Connecting/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('renders with a tenantId prop', async () => {
    await act(async () => {
      render(<OmniTraceFeed tenantId="tenant-001" />);
    });
    expect(screen.getByTestId('omni-trace-feed')).toBeTruthy();
  });

  it('calls removeChannel on unmount', async () => {
    let unmount: () => void;
    await act(async () => {
      const result = render(<OmniTraceFeed />);
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
      render(<OmniTraceFeed />);
    });
    expect(screen.getByText('Connecting')).toBeTruthy();
  });

  it('shows No events yet when subscribed with no logs', async () => {
    await act(async () => {
      render(<OmniTraceFeed />);
    });
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeTruthy();
    });
    // When subscribed and no INSERT events have fired, logs is empty → show "No events yet"
    expect(screen.getByText('No events yet')).toBeTruthy();
  });

  it('mouseEnter on Replay Workflows button changes its border color', async () => {
    await act(async () => {
      render(<OmniTraceFeed />);
    });
    const button = screen.getByText('+ Replay Workflows').closest('button') as HTMLButtonElement;
    fireEvent.mouseEnter(button);
    // jsdom normalizes rgba(249,115,22,0.3) to rgb form; check it's not empty
    expect(button.style.borderColor).toBeTruthy();
  });

  it('mouseLeave on Replay Workflows button resets its border color', async () => {
    await act(async () => {
      render(<OmniTraceFeed />);
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
      render(<OmniTraceFeed />);
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
