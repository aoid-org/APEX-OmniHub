/**
 * NFT Ownership Verification Edge Function
 *
 * Purpose: Verify NFT ownership via Alchemy NFT API with proper authentication
 *
 * Endpoint: POST /verify-nft
 *
 * Request Body:
 *   {
 *     "walletAddress": "0x...",
 *     "chainId": 1,           // 1=Ethereum, 137=Polygon
 *     "contractAddress": "0x...", // Must match MEMBERSHIP_NFT_ADDRESS
 *     "tokenId": "1"          // Optional: specific token ID
 *   }
 *
 * Response:
 *   { "hasNFT": boolean, "walletAddress": "0x...", "chainId": 1, "verifiedAt": "..." }
 *
 * Security:
 *   - JWT authentication required (Bearer token)
 *   - Input validation (Ethereum address format)
 *   - Wallet authorization against verified wallet_identities
 *   - Server-side membership NFT contract enforcement
 *   - Real blockchain verification via Alchemy NFT API
 *   - Fail-closed on missing config
 *
 * Environment Variables:
 *   - ALCHEMY_API_KEY_ETH (for chainId 1)
 *   - ALCHEMY_API_KEY_POLYGON (for chainId 137)
 *   - MEMBERSHIP_NFT_ADDRESS (server-authorized membership contract)
 *
 * Author: OmniLink APEX
 * Date: 2026-01-01
 * Updated: 2026-02-20 — wired to real Alchemy RPC, added auth + input validation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { buildCorsHeaders, handlePreflight, corsErrorResponse } from '../_shared/cors.ts';
import { createSupabaseClient, authenticateUser } from '../_shared/auth.ts';

/** Ethereum address regex: 0x followed by exactly 40 hex characters */
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Supported chain IDs mapped to Alchemy network slugs and env var names */
const CHAIN_CONFIG: Record<number, { slug: string; envKey: string }> = {
  1: { slug: 'eth-mainnet', envKey: 'ALCHEMY_API_KEY_ETH' },
  137: { slug: 'polygon-mainnet', envKey: 'ALCHEMY_API_KEY_POLYGON' },
};

serve(async (req) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return corsErrorResponse('METHOD_NOT_ALLOWED', 'Only POST requests are allowed', 405, origin);
  }

  try {
    // ── Authentication ──────────────────────────────────────────────
    const supabase = createSupabaseClient();
    const authResult = await authenticateUser(
      req.headers.get('Authorization'),
      supabase,
    );

    if (!authResult.success) {
      return corsErrorResponse('UNAUTHORIZED', authResult.error ?? 'Authentication required', 401, origin);
    }

    if (!authResult.user) {
      return corsErrorResponse('UNAUTHORIZED', 'Authenticated user context is required', 401, origin);
    }

    // ── Input parsing & validation ──────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return corsErrorResponse('INVALID_PAYLOAD', 'Request body must be valid JSON', 400, origin);
    }

    const { walletAddress, chainId, contractAddress, tokenId } = body as {
      walletAddress?: string;
      chainId?: number;
      contractAddress?: string;
      tokenId?: string;
    };

    if (!walletAddress || !ETH_ADDRESS_RE.test(walletAddress)) {
      return corsErrorResponse(
        'INVALID_WALLET',
        'walletAddress must be a valid Ethereum address (0x + 40 hex chars)',
        400,
        origin,
      );
    }

    if (!contractAddress || !ETH_ADDRESS_RE.test(contractAddress)) {
      return corsErrorResponse(
        'INVALID_CONTRACT',
        'contractAddress must be a valid Ethereum address (0x + 40 hex chars)',
        400,
        origin,
      );
    }

    const resolvedChainId = chainId ?? 1;
    const chainCfg = CHAIN_CONFIG[resolvedChainId];
    if (!chainCfg) {
      return corsErrorResponse(
        'UNSUPPORTED_CHAIN',
        `chainId ${resolvedChainId} is not supported. Supported: ${Object.keys(CHAIN_CONFIG).join(', ')}`,
        400,
        origin,
      );
    }

    const membershipNFTAddress = Deno.env.get('MEMBERSHIP_NFT_ADDRESS');
    if (!membershipNFTAddress || !ETH_ADDRESS_RE.test(membershipNFTAddress)) {
      console.error('MEMBERSHIP_NFT_ADDRESS not configured or invalid — fail-closed');
      return corsErrorResponse(
        'CONFIGURATION_ERROR',
        'NFT verification service is not configured with a membership contract',
        503,
        origin,
      );
    }

    if (contractAddress.toLowerCase() !== membershipNFTAddress.toLowerCase()) {
      return corsErrorResponse(
        'UNAUTHORIZED_CONTRACT',
        'Only the configured membership NFT contract may be verified',
        403,
        origin,
      );
    }

    // ── User wallet authorization ──────────────────────────────────
    const isVerifiedWallet = await isVerifiedWalletForUser(
      supabase,
      authResult.user.id,
      walletAddress,
      resolvedChainId,
    );

    if (!isVerifiedWallet) {
      return corsErrorResponse(
        'UNAUTHORIZED_WALLET',
        'walletAddress must be a verified wallet for the authenticated user',
        403,
        origin,
      );
    }

    // ── Alchemy API key ─────────────────────────────────────────────
    const alchemyKey = Deno.env.get(chainCfg.envKey);
    if (!alchemyKey) {
      console.error(`${chainCfg.envKey} not configured — fail-closed`);
      return corsErrorResponse(
        'CONFIGURATION_ERROR',
        'NFT verification service is not configured for this chain',
        503,
        origin,
      );
    }

    // ── Blockchain verification via Alchemy NFT API ─────────────────
    const hasNFT = await verifyNFTOwnership(
      walletAddress,
      membershipNFTAddress,
      alchemyKey,
      chainCfg.slug,
      tokenId,
    );

    const headers = buildCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        hasNFT,
        walletAddress,
        chainId: resolvedChainId,
        contractAddress: membershipNFTAddress,
        verifiedAt: new Date().toISOString(),
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('NFT verification error:', error);
    return corsErrorResponse(
      'VERIFICATION_ERROR',
      'An unexpected error occurred during NFT verification',
      500,
      origin,
    );
  }
});

async function isVerifiedWalletForUser(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  walletAddress: string,
  chainId: number,
): Promise<boolean> {
  const normalizedWallet = walletAddress.toLowerCase();

  const { data, error } = await supabase
    .from('wallet_identities')
    .select('id')
    .eq('user_id', userId)
    // Wallets are normalized at verification time; lowercase prevents checksum-case bypasses.
    .eq('wallet_address', normalizedWallet)
    .eq('chain_id', chainId)
    .maybeSingle();

  if (error) {
    console.error('wallet_identities authorization lookup failed:', error);
    return false;
  }

  return Boolean(data);
}

/**
 * Verify NFT ownership via Alchemy getNFTsForOwner API.
 *
 * For a specific tokenId the function calls getOwnersForNFT and checks
 * whether the wallet is among the owners. Otherwise it queries
 * getNFTsForOwner filtered by contract address.
 */
/** Timeout for Alchemy API calls — fail-closed if exceeded */
const ALCHEMY_TIMEOUT_MS = 10_000;

async function verifyNFTOwnership(
  walletAddress: string,
  contractAddress: string,
  alchemyKey: string,
  networkSlug: string,
  tokenId?: string,
): Promise<boolean> {
  const baseUrl = `https://${networkSlug}.g.alchemy.com/nft/v3/${alchemyKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ALCHEMY_TIMEOUT_MS);

  try {
    if (tokenId) {
      // Check specific token ownership via getOwnersForNFT
      const url = `${baseUrl}/getOwnersForNFT?contractAddress=${contractAddress}&tokenId=${tokenId}`;
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        console.error(`Alchemy getOwnersForNFT failed: ${res.status} ${res.statusText}`);
        return false;
      }

      const data = await res.json();
      const owners: string[] = (data.owners ?? []).map((o: string) => o.toLowerCase());
      return owners.includes(walletAddress.toLowerCase());
    }

    // Check if wallet owns any NFT from the contract via getNFTsForOwner
    const url =
      `${baseUrl}/getNFTsForOwner?owner=${walletAddress}` +
      `&contractAddresses[]=${contractAddress}&pageSize=1`;
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      console.error(`Alchemy getNFTsForOwner failed: ${res.status} ${res.statusText}`);
      return false;
    }

    const data = await res.json();
    return (data.ownedNfts?.length ?? 0) > 0;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`Alchemy API timed out after ${ALCHEMY_TIMEOUT_MS}ms — fail-closed`);
    } else {
      console.error('Alchemy fetch error:', err);
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}
