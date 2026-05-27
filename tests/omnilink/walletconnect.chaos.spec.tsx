/**
 * WalletConnect Chaos Battery
 *
 * Validates WalletConnect component behaviour under adverse conditions:
 *   - Strict TypeScript throughout — zero `any` types
 *   - Full mock isolation between tests via beforeEach
 *   - Covers: pending/connecting, error, connected, verified, rapid cycling
 *
 * Architecture:
 *   wagmi hooks  →  mock at module boundary
 *   useWalletVerification → mock at module boundary
 *   Each test overrides only the values it needs; defaults stay deterministic.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletConnect } from '@/components/WalletConnect';
import type { WalletState } from '@/lib/web3/types';

// ─── Module-level mocks ────────────────────────────────────────────────────

vi.mock('@/lib/web3/config', () => ({
  wagmiConfig: { chains: [], connectors: [], transports: {} },
  supportedChains: [],
  WEB3_API: { nonce: '/web3-nonce', verify: '/web3-verify' },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@/lib/monitoring', () => ({
  logError: vi.fn(),
  logAnalyticsEvent: vi.fn(),
}));

// Mocked wagmi hooks – typed with concrete interfaces so `any` is never needed.
vi.mock('wagmi', () => ({
  useConnect: vi.fn(),
  useAccount: vi.fn(),
  useSignMessage: vi.fn(),
  useDisconnect: vi.fn(),
  WagmiProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  createConfig: vi.fn(),
  http: vi.fn(),
}));

vi.mock('@/hooks/useWalletVerification', () => ({
  useWalletVerification: vi.fn(),
}));

// ─── Typed imports (post-mock) ─────────────────────────────────────────────

import { useConnect, useAccount } from 'wagmi';
import { useWalletVerification } from '@/hooks/useWalletVerification';

// ─── Typed mock interfaces ─────────────────────────────────────────────────

/** Minimal shape of a wagmi Connector required by WalletConnect component. */
interface MockConnector {
  id: string;
  name: string;
  icon?: string;
  type: string;
}

/** Exact shape returned by useConnect that the component destructures. */
interface MockUseConnectReturn {
  connect: (args: { connector: MockConnector }) => void;
  connectors: MockConnector[];
  isPending: boolean;
}

/** Exact shape returned by useAccount that the component destructures. */
interface MockUseAccountReturn {
  isConnected: boolean;
  address?: `0x${string}`;
  chainId?: number;
}

/** Exact shape returned by useWalletVerification that the component destructures. */
interface MockWalletVerificationReturn {
  walletState: WalletState;
  verify: () => Promise<void>;
  disconnect: () => void;
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
}

// ─── Reusable mock factories ───────────────────────────────────────────────

const MOCK_CONNECTOR: MockConnector = {
  id: 'injected',
  name: 'MetaMask',
  type: 'injected',
};

const MOCK_ADDRESS = '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef' as `0x${string}`;

function makeConnectReturn(overrides: Partial<MockUseConnectReturn> = {}): MockUseConnectReturn {
  return {
    connect: vi.fn(),
    connectors: [MOCK_CONNECTOR],
    isPending: false,
    ...overrides,
  };
}

function makeAccountReturn(overrides: Partial<MockUseAccountReturn> = {}): MockUseAccountReturn {
  return {
    isConnected: false,
    address: undefined,
    chainId: undefined,
    ...overrides,
  };
}

function makeVerificationReturn(
  overrides: Partial<MockWalletVerificationReturn> = {},
): MockWalletVerificationReturn {
  return {
    walletState: { status: 'disconnected', isVerified: false },
    verify: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    address: undefined,
    isConnected: false,
    chainId: undefined,
    ...overrides,
  };
}

// ─── Test suite ────────────────────────────────────────────────────────────

describe('WalletConnect Chaos Battery', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Safe defaults — every test starts from a clean disconnected state
    vi.mocked(useConnect).mockReturnValue(
      makeConnectReturn() as unknown as ReturnType<typeof useConnect>,
    );
    vi.mocked(useAccount).mockReturnValue(
      makeAccountReturn() as unknown as ReturnType<typeof useAccount>,
    );
    vi.mocked(useWalletVerification).mockReturnValue(makeVerificationReturn());
  });

  // ── Disconnected state ────────────────────────────────────────────────────

  it('renders connect button for each connector when disconnected', () => {
    render(<WalletConnect />);
    expect(screen.getByText(/Connect MetaMask/i)).toBeInTheDocument();
  });

  it('connect button is enabled when not pending', () => {
    render(<WalletConnect />);
    const btn = screen.getByRole('button', { name: /Connect MetaMask/i });
    expect(btn).not.toBeDisabled();
  });

  // ── Connecting / pending state ────────────────────────────────────────────

  it('shows Connecting… spinner and disables button when isPending', () => {
    vi.mocked(useConnect).mockReturnValue(
      makeConnectReturn({ isPending: true }) as unknown as ReturnType<typeof useConnect>,
    );

    render(<WalletConnect />);

    // The "Connecting..." text appears inside the button
    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /Connecting/i });
    expect(btn).toBeDisabled();
  });

  it('reverts to normal button label once pending resolves', () => {
    // Render with isPending: true, then switch to false
    const { rerender } = render(<WalletConnect />);

    vi.mocked(useConnect).mockReturnValue(
      makeConnectReturn({ isPending: true }) as unknown as ReturnType<typeof useConnect>,
    );
    rerender(<WalletConnect />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    vi.mocked(useConnect).mockReturnValue(
      makeConnectReturn({ isPending: false }) as unknown as ReturnType<typeof useConnect>,
    );
    rerender(<WalletConnect />);
    expect(screen.getByText(/Connect MetaMask/i)).toBeInTheDocument();
    expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
  });

  // ── Connected but unverified ──────────────────────────────────────────────

  it('shows Verify Wallet button when connected but not verified', () => {
    vi.mocked(useAccount).mockReturnValue(
      makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS, chainId: 1 }) as unknown as ReturnType<typeof useAccount>,
    );
    vi.mocked(useWalletVerification).mockReturnValue(
      makeVerificationReturn({
        walletState: { status: 'connected', isVerified: false },
        address: MOCK_ADDRESS,
        isConnected: true,
        chainId: 1,
      }),
    );

    render(<WalletConnect />);
    expect(screen.getByRole('button', { name: /Verify Wallet/i })).toBeInTheDocument();
  });

  it('calls verify() when Verify Wallet is clicked', () => {
    const mockVerify = vi.fn();

    vi.mocked(useAccount).mockReturnValue(
      makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS }) as unknown as ReturnType<typeof useAccount>,
    );
    vi.mocked(useWalletVerification).mockReturnValue(
      makeVerificationReturn({
        walletState: { status: 'connected', isVerified: false },
        verify: mockVerify,
        address: MOCK_ADDRESS,
        isConnected: true,
      }),
    );

    render(<WalletConnect />);
    fireEvent.click(screen.getByRole('button', { name: /Verify Wallet/i }));
    expect(mockVerify).toHaveBeenCalledOnce();
  });

  // ── Error state ───────────────────────────────────────────────────────────

  it('displays error message when walletState.error is set', () => {
    vi.mocked(useAccount).mockReturnValue(
      makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS }) as unknown as ReturnType<typeof useAccount>,
    );
    vi.mocked(useWalletVerification).mockReturnValue(
      makeVerificationReturn({
        walletState: {
          status: 'error',
          isVerified: false,
          error: 'User rejected signature',
        },
        address: MOCK_ADDRESS,
        isConnected: true,
      }),
    );

    render(<WalletConnect />);
    expect(screen.getByText(/User rejected signature/i)).toBeInTheDocument();
  });

  // ── Verified state ────────────────────────────────────────────────────────

  it('shows Wallet Verified section when isVerified is true', () => {
    vi.mocked(useAccount).mockReturnValue(
      makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS, chainId: 1 }) as unknown as ReturnType<typeof useAccount>,
    );
    vi.mocked(useWalletVerification).mockReturnValue(
      makeVerificationReturn({
        walletState: { status: 'verified', isVerified: true, chainId: 1 },
        address: MOCK_ADDRESS,
        isConnected: true,
        chainId: 1,
      }),
    );

    render(<WalletConnect />);
    expect(screen.getByText(/Wallet Verified/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disconnect Wallet/i })).toBeInTheDocument();
  });

  it('calls disconnect() when Disconnect Wallet is clicked', () => {
    const mockDisconnect = vi.fn();

    vi.mocked(useAccount).mockReturnValue(
      makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS }) as unknown as ReturnType<typeof useAccount>,
    );
    vi.mocked(useWalletVerification).mockReturnValue(
      makeVerificationReturn({
        walletState: { status: 'verified', isVerified: true },
        disconnect: mockDisconnect,
        address: MOCK_ADDRESS,
        isConnected: true,
      }),
    );

    render(<WalletConnect />);
    fireEvent.click(screen.getByRole('button', { name: /Disconnect Wallet/i }));
    expect(mockDisconnect).toHaveBeenCalledOnce();
  });

  // ── Rapid connect/disconnect cycle ────────────────────────────────────────

  it('handles rapid state transitions without stale renders', async () => {
    const { rerender } = render(<WalletConnect />);

    // Cycle through: disconnected → connecting → connected → verified
    const states: Array<{ account: MockUseAccountReturn; verification: MockWalletVerificationReturn }> = [
      {
        account: makeAccountReturn(),
        verification: makeVerificationReturn(),
      },
      {
        account: makeAccountReturn(),
        verification: makeVerificationReturn(),
      },
      {
        account: makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS }),
        verification: makeVerificationReturn({
          walletState: { status: 'connected', isVerified: false },
          address: MOCK_ADDRESS,
          isConnected: true,
        }),
      },
      {
        account: makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS }),
        verification: makeVerificationReturn({
          walletState: { status: 'verified', isVerified: true },
          address: MOCK_ADDRESS,
          isConnected: true,
        }),
      },
    ];

    for (const state of states) {
      vi.mocked(useAccount).mockReturnValue(
        state.account as unknown as ReturnType<typeof useAccount>,
      );
      vi.mocked(useWalletVerification).mockReturnValue(state.verification);
      rerender(<WalletConnect />);
    }

    // Final state should be verified
    await waitFor(() => {
      expect(screen.getByText(/Wallet Verified/i)).toBeInTheDocument();
    });
  });

  // ── Status badge rendering ────────────────────────────────────────────────

  it('renders Not Connected badge in disconnected state', () => {
    render(<WalletConnect />);
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
  });

  it('renders Connected badge in connected state', () => {
    vi.mocked(useAccount).mockReturnValue(
      makeAccountReturn({ isConnected: true, address: MOCK_ADDRESS }) as unknown as ReturnType<typeof useAccount>,
    );
    vi.mocked(useWalletVerification).mockReturnValue(
      makeVerificationReturn({
        walletState: { status: 'connected', isVerified: false },
        address: MOCK_ADDRESS,
        isConnected: true,
      }),
    );

    render(<WalletConnect />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});
