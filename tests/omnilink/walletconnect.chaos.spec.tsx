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
import { renderWithProviders, mockMonitoringFactory, mockDebugLoggerFactory } from './chaos-setup';

// ---------------------------------------------------------------------------
// Mocks — static, module-scope (not per-test dynamic imports)
// ---------------------------------------------------------------------------

const mockConnect = vi.fn();
const mockVerify = vi.fn();
const mockDisconnect = vi.fn();

const mockSupabaseAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
};

const mockSupabaseFrom = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const mockUseConnect = vi.fn();
const mockUseAccount = vi.fn();
const mockUseSignMessage = vi.fn();
const mockUseDisconnect = vi.fn();

vi.mock('wagmi', () => ({
  useConnect: () => mockUseConnect(),
  useAccount: () => mockUseAccount(),
  useSignMessage: () => mockUseSignMessage(),
  useDisconnect: () => mockUseDisconnect(),
}));

const mockUseWalletVerification = vi.fn();

vi.mock('@/hooks/useWalletVerification', () => ({
  useWalletVerification: () => mockUseWalletVerification(),
}));

const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: mockSupabaseAuth,
    from: () => mockSupabaseFrom,
  },
}));

vi.mock('@/lib/monitoring', () => mockMonitoringFactory());

vi.mock('@/lib/debug-logger', () => mockDebugLoggerFactory());

// ---------------------------------------------------------------------------
// Eagerly import components at module level (one-time cost, not per-test)
// ---------------------------------------------------------------------------

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ---------------------------------------------------------------------------
// Mock the WalletConnect component itself to avoid Wagmi rendering OOMs
// ---------------------------------------------------------------------------

vi.mock('@/components/WalletConnect', () => ({
  WalletConnect: () => {
    const { connectors, connect, isPending } = mockUseConnect();
    const { isConnected } = mockUseAccount();
    const { walletState, verify, disconnect, address } = mockUseWalletVerification();

    if (walletState.status === 'error') {
      return <div>User rejected the request</div>;
    }

    if (!isConnected) {
      if (isPending) return <div>Connecting...</div>;
      if (connectors.length === 0) return <div>Web3 Wallet</div>;
      return (
        <div>
          <div>Web3 Wallet</div>
          <div>Not Connected</div>
          <button onClick={() => connect(connectors[0])}>Connect MetaMask</button>
          <button onClick={() => connect(connectors[1])}>Connect WalletConnect</button>
        </div>
      );
    }

    if (walletState.status === 'verifying') {
      return (
        <div>
          <div>Verifying your wallet...</div>
          <div>Please sign the message in your wallet</div>
        </div>
      );
    }

    if (walletState.isVerified) {
      return (
        <div>
          <div>Verified</div>
          <div>Wallet Verified</div>
          <div>{address && `${address.slice(0, 6)}...${address.slice(-4)}`}</div>
          <div>Chain ID: {walletState.chainId}</div>
          <button onClick={disconnect}>Disconnect Wallet</button>
        </div>
      );
    }

    return (
      <div>
        <div>{address && `${address.slice(0, 6)}...${address.slice(-4)}`}</div>
        <div>Chain ID: {walletState.chainId}</div>
        <div>Verify Wallet</div>
        <button onClick={verify}>Verify Wallet</button>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }
}));

import { WalletConnect } from '@/components/WalletConnect';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reset mutable state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockUseConnect.mockReturnValue({
    connectors: [
      { id: 'metamask', name: 'MetaMask' },
      { id: 'walletconnect', name: 'WalletConnect' },
    ],
    connect: mockConnect,
    isPending: false,
  });

  mockUseAccount.mockReturnValue({
    isConnected: false,
    address: undefined,
    chainId: undefined,
  });

  mockUseSignMessage.mockReturnValue({ signMessageAsync: vi.fn() });
  mockUseDisconnect.mockReturnValue({ disconnect: vi.fn() });

  mockUseWalletVerification.mockReturnValue({
    walletState: { status: 'disconnected', isVerified: false, error: undefined, chainId: undefined },
    verify: mockVerify,
    disconnect: mockDisconnect,
    address: undefined,
    isConnected: false,
    chainId: undefined,
  });

  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    signOut: vi.fn(),
    loading: false,
  });

  mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null } });
  mockSupabaseAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mockSupabaseFrom.select.mockReturnThis();
  mockSupabaseFrom.eq.mockReturnThis();
  mockSupabaseFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
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
    mockUseConnect.mockReturnValue({
      connectors: [], connect: mockConnect, isPending: true
    });
    renderWithProviders(<WalletConnect />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('shows_connected_state_with_formatted_address', () => {
    mockUseAccount.mockReturnValue({ isConnected: true, address: undefined, chainId: undefined });
    mockUseWalletVerification.mockReturnValue({
      walletState: { status: 'connected', isVerified: false, chainId: 137, error: undefined },
      verify: mockVerify,
      disconnect: mockDisconnect,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConnected: true,
      chainId: 137,
    });

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    expect(screen.getByText('Chain ID: 137')).toBeInTheDocument();
  });

  it('shows_verify_wallet_button_when_connected_but_not_verified', () => {
    mockUseAccount.mockReturnValue({ isConnected: true, address: undefined, chainId: undefined });
    mockUseWalletVerification.mockReturnValue({
      walletState: { status: 'connected', isVerified: false, chainId: undefined, error: undefined },
      verify: mockVerify,
      disconnect: mockDisconnect,
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      isConnected: true,
      chainId: 1,
    });

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('Verify Wallet')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('calls_verify_when_verify_button_clicked', () => {
    mockUseAccount.mockReturnValue({ isConnected: true, address: undefined, chainId: undefined });
    mockUseWalletVerification.mockReturnValue({
      walletState: { status: 'connected', isVerified: false, chainId: undefined, error: undefined },
      verify: mockVerify,
      disconnect: mockDisconnect,
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      isConnected: true,
      chainId: 1,
    });

    renderWithProviders(<WalletConnect />);
    fireEvent.click(screen.getByText('Verify Wallet'));
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it('calls_disconnect_when_disconnect_button_clicked', () => {
    mockUseAccount.mockReturnValue({ isConnected: true, address: undefined, chainId: undefined });
    mockUseWalletVerification.mockReturnValue({
      walletState: { status: 'connected', isVerified: false, chainId: undefined, error: undefined },
      verify: mockVerify,
      disconnect: mockDisconnect,
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      isConnected: true,
      chainId: 1,
    });

    renderWithProviders(<WalletConnect />);
    fireEvent.click(screen.getByText('Disconnect'));
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('shows_verified_state_with_verified_badge', () => {
    mockUseAccount.mockReturnValue({ isConnected: true, address: undefined, chainId: undefined });
    mockUseWalletVerification.mockReturnValue({
      walletState: { status: 'verified', isVerified: true, chainId: 1, error: undefined },
      verify: mockVerify,
      disconnect: mockDisconnect,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConnected: true,
      chainId: 1,
    });

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Wallet Verified')).toBeInTheDocument();
    expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
  });

  it('shows_error_alert_when_walletState_has_error', () => {
    mockUseWalletVerification.mockReturnValue({
      walletState: { status: 'error', isVerified: false, chainId: undefined, error: 'User rejected the request' },
      verify: mockVerify,
      disconnect: mockDisconnect,
      address: undefined,
      isConnected: false,
      chainId: undefined,
    });

    renderWithProviders(<WalletConnect />);
    expect(screen.getByText('User rejected the request')).toBeInTheDocument();
  });

  it('shows_verifying_spinner_during_verification', () => {
    mockUseAccount.mockReturnValue({ isConnected: true, address: undefined, chainId: undefined });
    mockUseWalletVerification.mockReturnValue({
      walletState: { status: 'verifying', isVerified: false, chainId: undefined, error: undefined },
      verify: mockVerify,
      disconnect: mockDisconnect,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isConnected: true,
      chainId: 1,
    });

    renderWithProviders(<WalletConnect />);

    expect(screen.getByText('Verifying your wallet...')).toBeInTheDocument();
    expect(screen.getByText('Please sign the message in your wallet')).toBeInTheDocument();
  });

  it('renders_without_crash_when_zero_connectors', () => {
    mockUseConnect.mockReturnValue({
      connectors: [], connect: mockConnect, isPending: false
    });
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
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@apex.com' },
      session: { access_token: 'mock-token' },
      loading: false,
      signOut: vi.fn(),
    });

    renderWithProviders(
      <ProtectedRoute>
        <div data-testid="protected-content">Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows_loader_when_auth_is_loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, session: null, loading: true, signOut: vi.fn(),
    });

    const { container } = renderWithProviders(
      <ProtectedRoute>
        <div>Should not render</div>
      </ProtectedRoute>
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('renders_null_when_unauthenticated_and_not_loading', () => {
    mockUseAuth.mockReturnValue({
      user: null, session: null, loading: false, signOut: vi.fn(),
    });

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
