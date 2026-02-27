/**
 * OmniLink Core Component Chaos Battery Tests
 *
 * Covers:
 *   - WalletConnect: all render states, connect/verify/disconnect, error display
 *   - ProtectedRoute: auth redirect, loading state, gate
 *   - ErrorBoundary: error capture, fallback, reset
 *
 * Strategy: All mocks are declared at module scope and mutated via .mockReturnValue()
 * to avoid re-importing wagmi on each test (which exhausts the V8 heap in jsdom).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockMonitoringFactory, mockDebugLoggerFactory, mockAuthContextFactory } from './chaos-setup';

// ---------------------------------------------------------------------------
// Mocks — static, module-scope (not per-test dynamic imports)
// ---------------------------------------------------------------------------

const mockConnect = vi.fn();
const mockVerify = vi.fn();
const mockDisconnect = vi.fn();

// Mutable state containers for wagmi hooks
const wagmiConnectState = {
  connectors: [
    { id: 'metamask', name: 'MetaMask' },
    { id: 'walletconnect', name: 'WalletConnect' },
  ],
  connect: mockConnect,
  isPending: false,
};

const wagmiAccountState = {
  isConnected: false,
  address: undefined as string | undefined,
  chainId: undefined as number | undefined,
};

const walletVerifState = {
  walletState: { status: 'disconnected' as string, isVerified: false, error: undefined as string | undefined, chainId: undefined as number | undefined } as WalletState,
  verify: mockVerify,
  disconnect: mockDisconnect,
  address: undefined as string | undefined,
  isConnected: false,
  chainId: undefined as number | undefined,
};

const wagmiSignMessageState = { signMessageAsync: vi.fn() };
const wagmiDisconnectState = { disconnect: vi.fn() };

vi.mock('wagmi', () => ({
  useConnect: vi.fn(() => wagmiConnectState),
  useAccount: vi.fn(() => wagmiAccountState),
  useSignMessage: vi.fn(() => wagmiSignMessageState),
  useDisconnect: vi.fn(() => wagmiDisconnectState),
}));

vi.mock('@/hooks/useWalletVerification', () => ({
  useWalletVerification: vi.fn(() => walletVerifState),
}));

const authState = {
  user: null as { id: string; email: string } | null,
  session: null as { access_token: string } | null,
  signOut: vi.fn(),
  loading: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => authState),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/lib/monitoring', () => mockMonitoringFactory());

vi.mock('@/lib/debug-logger', () => mockDebugLoggerFactory());

// ---------------------------------------------------------------------------
// Eagerly import components at module level (one-time cost, not per-test)
// ---------------------------------------------------------------------------

import { WalletConnect } from '@/components/WalletConnect';
import type { WalletState } from '@/lib/web3/types';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reset mutable state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Reset to disconnected defaults
  wagmiConnectState.connectors = [
    { id: 'metamask', name: 'MetaMask' },
    { id: 'walletconnect', name: 'WalletConnect' },
  ];
  wagmiConnectState.isPending = false;
  wagmiAccountState.isConnected = false;
  wagmiAccountState.address = undefined;
  wagmiAccountState.chainId = undefined;

  walletVerifState.walletState = { status: 'disconnected', isVerified: false, error: undefined, chainId: undefined };
  walletVerifState.address = undefined;
  walletVerifState.isConnected = false;
  walletVerifState.chainId = undefined;

  authState.user = null;
  authState.session = null;
  authState.loading = false;
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 1: WalletConnect — All Render States
// ═══════════════════════════════════════════════════════════════════════════

describe('WalletConnect — Chaos Battery', () => {
  it('renders_disconnected_state_with_not_connected_badge', () => {
    renderWithProviders(<WalletConnect />);
    expect(screen.getByText('Web3 Wallet')).toBeInTheDocument();
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
  });

  it('renders_connector_buttons_for_each_available_connector', () => {
    renderWithProviders(<WalletConnect />);
    expect(screen.getByText('Connect MetaMask')).toBeInTheDocument();
    expect(screen.getByText('Connect WalletConnect')).toBeInTheDocument();
  });

  it('shows_connecting_spinner_when_isPending', () => {
    wagmiConnectState.isPending = true;
    renderWithProviders(<WalletConnect />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows_connected_state_with_formatted_address', () => {
    wagmiAccountState.isConnected = true;
    walletVerifState.walletState = { status: 'connected', isVerified: false, chainId: 137 } as WalletState;
    walletVerifState.address = '0x1234567890abcdef1234567890abcdef12345678';
    walletVerifState.isConnected = true;
    walletVerifState.chainId = 137;

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('Chain ID: 137')).toBeInTheDocument();
  });

  it('shows_verify_wallet_button_when_connected_but_not_verified', () => {
    walletVerifState.walletState = { status: 'connected', isVerified: false } as WalletState;
    walletVerifState.address = '0xabcdef1234567890abcdef1234567890abcdef12';
    walletVerifState.isConnected = true;
    walletVerifState.chainId = 1;

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('Verify Wallet')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('calls_verify_when_verify_button_clicked', () => {
    walletVerifState.walletState = { status: 'connected', isVerified: false } as WalletState;
    walletVerifState.address = '0xabcdef1234567890abcdef1234567890abcdef12';
    walletVerifState.isConnected = true;
    walletVerifState.chainId = 1;

    renderWithProviders(<WalletConnect />);
    fireEvent.click(screen.getByText('Verify Wallet'));
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it('calls_disconnect_when_disconnect_button_clicked', () => {
    walletVerifState.walletState = { status: 'connected', isVerified: false } as WalletState;
    walletVerifState.address = '0xabcdef1234567890abcdef1234567890abcdef12';
    walletVerifState.isConnected = true;
    walletVerifState.chainId = 1;

    renderWithProviders(<WalletConnect />);
    fireEvent.click(screen.getByText('Disconnect'));
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('shows_verified_state_with_verified_badge', () => {
    walletVerifState.walletState = { status: 'verified', isVerified: true, chainId: 1 } as WalletState;
    walletVerifState.address = '0x1234567890abcdef1234567890abcdef12345678';
    walletVerifState.isConnected = true;
    walletVerifState.chainId = 1;

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Wallet Verified')).toBeInTheDocument();
    expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
  });

  it('shows_error_alert_when_walletState_has_error', () => {
    walletVerifState.walletState = {
      status: 'error',
      isVerified: false,
      error: 'User rejected the request',
    } as WalletState;

    renderWithProviders(<WalletConnect />);
    expect(screen.getByText('User rejected the request')).toBeInTheDocument();
  });

  it('shows_verifying_spinner_during_verification', () => {
    walletVerifState.walletState = { status: 'verifying', isVerified: false } as WalletState;
    walletVerifState.address = '0x1234567890abcdef1234567890abcdef12345678';
    walletVerifState.isConnected = true;
    walletVerifState.chainId = 1;

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('Verifying your wallet...')).toBeInTheDocument();
    expect(screen.getByText('Please sign the message in your wallet')).toBeInTheDocument();
  });

  it('renders_without_crash_when_zero_connectors', () => {
    wagmiConnectState.connectors = [];
    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('Web3 Wallet')).toBeInTheDocument();
    expect(screen.queryByText('Connect MetaMask')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 2: ProtectedRoute — Auth Gate Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('ProtectedRoute — Auth Gate Tests', () => {
  it('renders_children_when_user_is_authenticated', () => {
    authState.user = { id: 'user-1', email: 'test@apex.com' };
    authState.session = { access_token: 'mock-token' };

    renderWithProviders(
      <ProtectedRoute>
        <div data-testid="protected-content">Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows_loader_when_auth_is_loading', () => {
    authState.user = null;
    authState.session = null;
    authState.loading = true;

    const { container } = renderWithProviders(
      <ProtectedRoute>
        <div>Should not render</div>
      </ProtectedRoute>
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('renders_null_when_unauthenticated_and_not_loading', () => {
    authState.user = null;
    authState.session = null;
    authState.loading = false;

    renderWithProviders(
      <ProtectedRoute>
        <div data-testid="should-not-render">Protected</div>
      </ProtectedRoute>
    );

    expect(screen.queryByTestId('should-not-render')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 3: ErrorBoundary — Resilience Tests
// ═══════════════════════════════════════════════════════════════════════════

function ThrowingComponent({ error }: { error: Error }): React.ReactNode {
  throw error;
}

function SafeComponent() {
  return <div data-testid="safe-content">Everything is fine</div>;
}

describe('ErrorBoundary — Resilience Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('catches_thrown_error_and_renders_fallback_ui', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Test explosion')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test explosion')).toBeInTheDocument();
  });

  it('shows_custom_fallback_when_provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowingComponent error={new Error('Boom')} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders_try_again_and_go_home_buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Crash')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Go home')).toBeInTheDocument();
  });

  it('renders_children_when_no_error', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('safe-content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows_generic_message_when_error_has_no_message', () => {
    const errorNoMsg = new Error('Unknown error');
    errorNoMsg.message = '';
    render(
      <ErrorBoundary>
        <ThrowingComponent error={errorNoMsg} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });
});
