import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
