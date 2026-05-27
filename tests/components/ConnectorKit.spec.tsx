/**
 * ConnectorKit — Unit Tests
 * Tests API key generation flow, loading state, error handling, and config copy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

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

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Import after mocks ───────────────────────────────────────────────────

import { ConnectorKit } from '@/components/ConnectorKit';

// ─── Fixtures ─────────────────────────────────────────────────────────────

const mockIntegration: any = {
  id: 'meta-business',
  name: 'Meta Business',
  provider: 'meta',
  description: 'Connect Meta Business Suite',
  scopes: ['pages_read', 'ads_read'],
  authType: 'oauth2' as const,
  icon: '/icons/meta.svg',
  type: 'meta',
  requiresApiKey: true,
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('ConnectorKit', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    it('renders integration id in config JSON', () => {
      render(<ConnectorKit integration={mockIntegration} />);
      // Integration id appears in the JSON config block
      expect(screen.getByText(/meta-business/)).toBeInTheDocument();
    });

    it('renders Generate New API Key button', () => {
      render(<ConnectorKit integration={mockIntegration} />);
      expect(screen.getByRole('button', { name: /generate new api key/i })).toBeInTheDocument();
    });

    it('shows server URL config', () => {
      render(<ConnectorKit integration={mockIntegration} />);
      // Server URL input should be rendered
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('handleGenerateKey', () => {
    it('shows error toast when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      render(<ConnectorKit integration={mockIntegration} />);
      fireEvent.click(screen.getByRole('button', { name: /generate.*key/i }));
      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('You must be logged in');
      });
    });

    it('calls fetch with correct endpoint and auth header', async () => {
      const accessToken = 'test-access-token';
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: accessToken } },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ key: 'sk-test-12345', key_prefix: 'sk-test' }),
      });

      render(<ConnectorKit integration={mockIntegration} />);
      fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/functions/v1/omnilink-port/keys'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: `Bearer ${accessToken}`,
            }),
          })
        );
      });
    });

    it('shows success toast and calls onConnect on successful key generation', async () => {
      const onConnect = vi.fn();
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token-abc' } },
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ key: 'sk-generated-key', key_prefix: 'sk-gen' }),
      });

      render(<ConnectorKit integration={mockIntegration} onConnect={onConnect} />);
      fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('New API Key generated successfully');
        expect(onConnect).toHaveBeenCalledOnce();
      });
    });

    it('shows error toast when fetch returns non-ok response', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token-abc' } },
      });
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Forbidden' }),
      });

      render(<ConnectorKit integration={mockIntegration} />);
      fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Forbidden');
      });
    });

    it('shows error toast when fetch throws network error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token-abc' } },
      });
      mockFetch.mockRejectedValue(new Error('Network failure'));

      render(<ConnectorKit integration={mockIntegration} />);
      fireEvent.click(screen.getByRole('button', { name: /generate new api key/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Network failure');
      });
      consoleError.mockRestore();
    });

    it('disables Generate Key button while loading', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token-abc' } },
      });
      // Hang the fetch indefinitely
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<ConnectorKit integration={mockIntegration} />);
      const btn = screen.getByRole('button', { name: /generate new api key/i });
      fireEvent.click(btn);

      // Button becomes disabled during loading
      await waitFor(() => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('copy config', () => {
    it('shows Copy JSON button (disabled when no key generated)', () => {
      render(<ConnectorKit integration={mockIntegration} />);
      const copyBtn = screen.getByRole('button', { name: /copy json/i });
      // Without a key, the button is disabled
      expect(copyBtn).toBeDisabled();
    });
  });
});
