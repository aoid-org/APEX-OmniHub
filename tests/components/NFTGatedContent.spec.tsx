/**
 * NFTGatedContent — Unit Tests
 * Tests NFT ownership gating: unverified, checking, denied, and granted states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockCheckEntitlement = vi.fn();
const mockUseWalletVerification = vi.fn();

vi.mock('@/hooks/useWalletVerification', () => ({
  useWalletVerification: () => mockUseWalletVerification(),
}));

vi.mock('@/lib/web3/entitlements', () => ({
  checkEntitlement: (...args: unknown[]) => mockCheckEntitlement(...args),
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { NFTGatedContent } from '@/components/NFTGatedContent';

// ─── Fixtures ─────────────────────────────────────────────────────────────

const nftConfig = {
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  chainId: 1,
  entitlementKey: 'nft:bayc-premium',
  title: 'BAYC Premium Features',
  description: 'Exclusive content for BAYC holders',
};

const WALLET_ADDRESS = '0xABCDEF1234567890' as `0x${string}`;

// ─── Tests ────────────────────────────────────────────────────────────────

describe('NFTGatedContent', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('unverified wallet state', () => {
    it('shows wallet connection prompt when wallet is not verified', () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: false, address: null },
      });
      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );
      expect(screen.getByText('BAYC Premium Features')).toBeInTheDocument();
      expect(screen.getByText(/connect and verify your wallet/i)).toBeInTheDocument();
      expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
    });

    it('shows lock icon and description when unverified', () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: false, address: null },
      });
      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );
      expect(screen.getByText('Exclusive content for BAYC holders')).toBeInTheDocument();
    });
  });

  describe('checking state', () => {
    it('shows checking spinner while entitlement is loading', () => {
      // Wallet is verified but checkEntitlement hangs
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockImplementation(() => new Promise(() => {})); // never resolves

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );
      expect(screen.getByText(/checking nft ownership/i)).toBeInTheDocument();
    });
  });

  describe('access denied state', () => {
    it('shows access denied when entitlement check returns false', async () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockResolvedValue({ hasEntitlement: false, cacheHit: false });

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
      expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
    });

    it('shows custom fallback when access is denied and fallback is provided', async () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockResolvedValue({ hasEntitlement: false, cacheHit: false });

      render(
        <NFTGatedContent config={nftConfig} fallback={<div>Custom Fallback</div>}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
      });
    });

    it('shows error message when entitlement check fails with error', async () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockResolvedValue({
        hasEntitlement: false,
        cacheHit: false,
        error: 'RPC unavailable',
      });

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(screen.getByText('RPC unavailable')).toBeInTheDocument();
      });
    });

    it('handles thrown exception from checkEntitlement gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockRejectedValue(new Error('Network error'));

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
      expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
      consoleError.mockRestore();
    });
  });

  describe('access granted state', () => {
    it('renders children when NFT entitlement is granted', async () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockResolvedValue({ hasEntitlement: true, cacheHit: false });

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Content')).toBeInTheDocument();
      });
    });

    it('shows Premium Access Granted badge', async () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockResolvedValue({ hasEntitlement: true, cacheHit: false });

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(screen.getByText('Premium Access Granted')).toBeInTheDocument();
      });
    });

    it('shows "Cached" label when cacheHit is true', async () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockResolvedValue({ hasEntitlement: true, cacheHit: true });

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Premium Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(screen.getByText(/Cached/)).toBeInTheDocument();
      });
    });

    it('calls checkEntitlement with correct params', async () => {
      mockUseWalletVerification.mockReturnValue({
        walletState: { isVerified: true, address: WALLET_ADDRESS },
      });
      mockCheckEntitlement.mockResolvedValue({ hasEntitlement: true, cacheHit: false });

      render(
        <NFTGatedContent config={nftConfig}>
          <div>Content</div>
        </NFTGatedContent>
      );

      await waitFor(() => {
        expect(mockCheckEntitlement).toHaveBeenCalledWith({
          walletAddress: WALLET_ADDRESS,
          chainId: 1,
          contractAddress: nftConfig.contractAddress,
          entitlementKey: 'nft:bayc-premium',
        });
      });
    });
  });
});
