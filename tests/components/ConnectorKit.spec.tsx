/**
 * ConnectorKit — Unit Tests
 * Tests pre-save connection test, API key generation flow, loading state,
 * plain-language error handling, and config copy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockGetSession = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { ConnectorKit } from '@/components/ConnectorKit';

const MockIcon = () => <svg aria-hidden="true" />;

const mockIntegration = {
  id: 'meta-business',
  name: 'Meta Business',
  description: 'Connect Meta Business Suite',
  scopes: ['pages_read', 'ads_read'],
  icon: MockIcon,
  type: 'meta',
  requiresApiKey: true,
};

async function passConnectionTest() {
  fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
  await screen.findByText(/connection test passed/i);
}

describe('ConnectorKit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders integration id in config JSON and server URL config', () => {
    render(<ConnectorKit integration={mockIntegration} />);
    expect(screen.getByText(/meta-business/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate new api key/i })).toBeDisabled();
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });

  it('requires authentication before testing a connection', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ConnectorKit integration={mockIntegration} />);
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('You must be logged in'));
  });

  it('blocks key generation until Test Connection passes', () => {
    render(<ConnectorKit integration={mockIntegration} />);
    expect(screen.getByRole('button', { name: /generate new api key/i })).toBeDisabled();
    expect(screen.getByText(/required before save/i)).toBeInTheDocument();
  });

  it('shows plain-language copy when Test Connection fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'forbidden' }) });
    render(<ConnectorKit integration={mockIntegration} />);
    fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/account needs admin access/i)).toBeInTheDocument();
  });

  it('calls key generation endpoint with auth header after connection test passes', async () => {
    const accessToken = 'test-access-token';
    mockGetSession.mockResolvedValue({ data: { session: { access_token: accessToken } } });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ key: 'sk-test-12345', key_prefix: 'sk-test' }) });

    render(<ConnectorKit integration={mockIntegration} />);
    await passConnectionTest();
    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringMatching(/\/functions\/v1\/omnilink-port\/keys$/),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: `Bearer ${accessToken}` }),
        }),
      );
    });
  });

  it('shows success toast and calls onConnect on successful key generation', async () => {
    const onConnect = vi.fn();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ key: 'sk-generated-key', key_prefix: 'sk-gen' }) });

    render(<ConnectorKit integration={mockIntegration} onConnect={onConnect} />);
    await passConnectionTest();
    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('New API Key generated successfully');
      expect(onConnect).toHaveBeenCalledOnce();
    });
  });

  it('shows plain-language error toast when key generation returns non-ok', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Forbidden' }) });

    render(<ConnectorKit integration={mockIntegration} />);
    await passConnectionTest();
    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Your account needs admin access to connect this app. Ask an administrator to grant access.');
    });
  });

  it('shows plain-language error toast when fetch throws network error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
      .mockRejectedValueOnce(new Error('Network failure'));

    render(<ConnectorKit integration={mockIntegration} />);
    await passConnectionTest();
    fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('We could not reach the connection service. Check your internet connection, then retry.');
    });
    consoleError.mockRestore();
  });

  it('disables Generate Key button while loading', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) })
      .mockImplementationOnce(() => new Promise(() => {}));

    render(<ConnectorKit integration={mockIntegration} />);
    await passConnectionTest();
    const btn = screen.getByRole('button', { name: /generate new api key/i });
    fireEvent.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());
  });

  it('shows Copy JSON button disabled when no key is generated', () => {
    render(<ConnectorKit integration={mockIntegration} />);
    expect(screen.getByRole('button', { name: /copy json/i })).toBeDisabled();
  });
});
