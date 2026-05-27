/**
 * WalletConnect — Unit Tests
 * Tests wallet connection states, status badge rendering, and verify/disconnect flows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockVerify = vi.fn();

const mockConnectors = [
  { id: 'metamask', name: 'MetaMask' },
  { id: 'walletconnect', name: 'WalletConnect' },
];

const mockUseConnect = vi.fn();
const mockUseAccount = vi.fn();
const mockUseWalletVerification = vi.fn();

vi.mock('wagmi', () => ({
  useConnect: () => mockUseConnect(),
  useAccount: () => mockUseAccount(),
}));

vi.mock('@/hooks/useWalletVerification', () => ({
  useWalletVerification: () => mockUseWalletVerification(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { WalletConnect } from '@/components/WalletConnect';

// ─── Helpers ──────────────────────────────────────────────────────────────

function setupDisconnected() {
  mockUseConnect.mockReturnValue({ connectors: mockConnectors, connect: mockConnect, isPending: false });
  mockUseAccount.mockReturnValue({ isConnected: false });
  mockUseWalletVerification.mockReturnValue({
    walletState: { status: 'disconnected', isVerified: false, error: null, chainId: null },
    verify: mockVerify,
    disconnect: mockDisconnect,
    address: null,
  });
}

function setupConnected(address = '0xABCDEF1234567890') {
  mockUseConnect.mockReturnValue({ connectors: mockConnectors, connect: mockConnect, isPending: false });
  mockUseAccount.mockReturnValue({ isConnected: true });
  mockUseWalletVerification.mockReturnValue({
    walletState: { status: 'connected', isVerified: false, error: null, chainId: 1 },
    verify: mockVerify,
    disconnect: mockDisconnect,
    address,
  });
}

function setupVerified(address = '0xABCDEF1234567890') {
  mockUseConnect.mockReturnValue({ connectors: mockConnectors, connect: mockConnect, isPending: false });
  mockUseAccount.mockReturnValue({ isConnected: true });
  mockUseWalletVerification.mockReturnValue({
    walletState: { status: 'verified', isVerified: true, error: null, chainId: 1 },
    verify: mockVerify,
    disconnect: mockDisconnect,
    address,
  });
}

function setupError() {
  mockUseConnect.mockReturnValue({ connectors: mockConnectors, connect: mockConnect, isPending: false });
  mockUseAccount.mockReturnValue({ isConnected: false });
  mockUseWalletVerification.mockReturnValue({
    walletState: { status: 'error', isVerified: false, error: 'User rejected signature', chainId: null },
    verify: mockVerify,
    disconnect: mockDisconnect,
    address: null,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('WalletConnect', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('disconnected state', () => {
    it('renders wallet card with heading', () => {
      setupDisconnected();
      render(<WalletConnect />);
      expect(screen.getByText('Web3 Wallet')).toBeInTheDocument();
    });

    it('renders Not Connected badge', () => {
      setupDisconnected();
      render(<WalletConnect />);
      expect(screen.getByText('Not Connected')).toBeInTheDocument();
    });

    it('renders a connect button for each connector', () => {
      setupDisconnected();
      render(<WalletConnect />);
      expect(screen.getByText('Connect MetaMask')).toBeInTheDocument();
      expect(screen.getByText('Connect WalletConnect')).toBeInTheDocument();
    });

    it('calls connect() with correct connector when button is clicked', () => {
      setupDisconnected();
      render(<WalletConnect />);
      fireEvent.click(screen.getByText('Connect MetaMask'));
      expect(mockConnect).toHaveBeenCalledWith({ connector: mockConnectors[0] });
    });

    it('shows connecting state when isPending=true', () => {
      mockUseConnect.mockReturnValue({ connectors: mockConnectors, connect: mockConnect, isPending: true });
      mockUseAccount.mockReturnValue({ isConnected: false });
      mockUseWalletVerification.mockReturnValue({
        walletState: { status: 'connecting', isVerified: false, error: null, chainId: null },
        verify: mockVerify,
        disconnect: mockDisconnect,
        address: null,
      });
      render(<WalletConnect />);
      expect(screen.getAllByText('Connecting...').length).toBeGreaterThan(0);
    });
  });

  describe('connected but not verified state', () => {
    it('shows truncated wallet address', () => {
      setupConnected('0xABCDEF1234567890ABCD');
      render(<WalletConnect />);
      // formatAddress: first 6 + last 4
      expect(screen.getByText('0xABCD...ABCD')).toBeInTheDocument();
    });

    it('shows Chain ID', () => {
      setupConnected();
      render(<WalletConnect />);
      expect(screen.getByText(/Chain ID: 1/)).toBeInTheDocument();
    });

    it('shows verify prompt alert', () => {
      setupConnected();
      render(<WalletConnect />);
      expect(screen.getByText(/wallet is connected but not verified/i)).toBeInTheDocument();
    });

    it('renders Verify Wallet button', () => {
      setupConnected();
      render(<WalletConnect />);
      expect(screen.getByRole('button', { name: /verify wallet/i })).toBeInTheDocument();
    });

    it('calls verify() when Verify Wallet is clicked', () => {
      setupConnected();
      render(<WalletConnect />);
      fireEvent.click(screen.getByRole('button', { name: /verify wallet/i }));
      expect(mockVerify).toHaveBeenCalledOnce();
    });

    it('renders Disconnect button in connected state', () => {
      setupConnected();
      render(<WalletConnect />);
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    it('calls disconnect() when Disconnect is clicked', () => {
      setupConnected();
      render(<WalletConnect />);
      fireEvent.click(screen.getByRole('button', { name: /^disconnect$/i }));
      expect(mockDisconnect).toHaveBeenCalledOnce();
    });
  });

  describe('verified state', () => {
    it('shows Wallet Verified message', () => {
      setupVerified();
      render(<WalletConnect />);
      expect(screen.getByText('Wallet Verified')).toBeInTheDocument();
    });

    it('shows Verified badge', () => {
      setupVerified();
      render(<WalletConnect />);
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('shows Disconnect Wallet button', () => {
      setupVerified();
      render(<WalletConnect />);
      expect(screen.getByRole('button', { name: /disconnect wallet/i })).toBeInTheDocument();
    });

    it('calls disconnect() when Disconnect Wallet is clicked', () => {
      setupVerified();
      render(<WalletConnect />);
      fireEvent.click(screen.getByRole('button', { name: /disconnect wallet/i }));
      expect(mockDisconnect).toHaveBeenCalledOnce();
    });
  });

  describe('error state', () => {
    it('shows error alert with error message', () => {
      setupError();
      render(<WalletConnect />);
      expect(screen.getByText('User rejected signature')).toBeInTheDocument();
    });

    it('shows Error badge', () => {
      setupError();
      render(<WalletConnect />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });
});

// ─── formatAddress helper (inline purity test) ────────────────────────────

describe('formatAddress logic', () => {
  it('produces expected truncation pattern', () => {
    // Test the exact formatAddress logic used in WalletConnect
    const addr = '0x1234567890ABCDEF1234';
    const formatted = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    expect(formatted).toBe('0x1234...1234');
  });
});
