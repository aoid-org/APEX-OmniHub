/**
 * NFT Ownership Verification Edge Function
 *
 * Purpose: Verify if user owns APEXMembershipNFT for premium access
 *
 * Endpoint: GET/POST /verify-nft
 *
 * Query Parameters:
 *   ?user_id=<optional> - Verify specific user (requires auth)
 *
 * POST Body:
 *   {
 *     "wallet_address": "0x...",
 *     "agent_key": "agent-key",
 *     "agent_signature": "0x..."
 *   }
 *
 * Response:
 *   {
 *     "hasPremiumNFT": boolean,
 *     "wallet_address": "0x...",
 *     "nft_balance": number,
 *     "verified_at": "...",
 *     "cached": boolean,
 *     "agent_key_verified": boolean
 *   }
 *
 * Security:
 *   - Requires authenticated session (JWT) OR service-signed POST
 *   - Uses service role for database access
 *   - Caches NFT verification for 5 minutes per user
 *   - Rate limited (30 requests per minute per user)
 *   - Fail-safe: returns false on errors
 *
 * Environment Variables:
 *   - ALCHEMY_API_KEY_POLYGON or ALCHEMY_API_KEY_ETH
 *   - MEMBERSHIP_NFT_ADDRESS
 *
 * Author: OmniLink APEX
 * Date: 2026-01-01
 */

import { createPublicClient, http, verifyMessage } from 'https://esm.sh/viem@2.43.4';
import { polygon, mainnet } from 'https://esm.sh/viem@2.43.4/chains';
import { handleCors, corsJsonResponse } from '../_shared/cors.ts';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../_shared/rate-limit.ts';
import { createSupabaseClient, authenticateUser, createAuthErrorResponse, createMethodNotAllowedResponse } from '../_shared/auth.ts';

// Cache configuration
const NFT_VERIFICATION_CACHE_MS = 5 * 60 * 1000; // 5 minutes
const verificationCache = new Map<string, { hasPremiumNFT: boolean; balance: number; cachedAt: number }>();

// ERC721 balanceOf ABI
const ERC721_BALANCE_OF_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;



/**
 * Get cached verification result if still valid
 */
function getCachedVerification(walletAddress: string): { hasPremiumNFT: boolean; balance: number } | null {
  const cached = verificationCache.get(walletAddress.toLowerCase());
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.cachedAt > NFT_VERIFICATION_CACHE_MS) {
    verificationCache.delete(walletAddress.toLowerCase());
    return null;
  }

  return { hasPremiumNFT: cached.hasPremiumNFT, balance: cached.balance };
}

/**
 * Cache verification result
 */
function cacheVerification(walletAddress: string, hasPremiumNFT: boolean, balance: number) {
  verificationCache.set(walletAddress.toLowerCase(), {
    hasPremiumNFT,
    balance,
    cachedAt: Date.now(),
  });
}

/**
 * Compute HMAC signature for service-authenticated requests.
 */
async function computeServiceHmac(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function isServiceAuthorized(req: Request, bodyText: string): Promise<boolean> {
  const timestamp = req.headers.get('x-apex-service-timestamp');
  const signature = req.headers.get('x-apex-service-signature');
  if (!timestamp || !signature) return false;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) return false;

  const expected = await computeServiceHmac(serviceKey, `${timestamp}.${bodyText}`);
  return timingSafeEqual(expected, signature);
}

/**
 * Verify NFT ownership via blockchain RPC
 */
async function verifyNFTOwnership(walletAddress: string): Promise<{ balance: number; hasPremiumNFT: boolean }> {
  // Get environment configuration
  const nftContractAddress = Deno.env.get('MEMBERSHIP_NFT_ADDRESS');
  if (!nftContractAddress) {
    throw new Error('MEMBERSHIP_NFT_ADDRESS not configured');
  }

  // Determine network and RPC URL
  const usePolygon = Deno.env.get('VITE_WEB3_NETWORK') === 'polygon';
  const alchemyKey = usePolygon
    ? Deno.env.get('ALCHEMY_API_KEY_POLYGON')
    : Deno.env.get('ALCHEMY_API_KEY_ETH');

  if (!alchemyKey) {
    throw new Error('Alchemy API key not configured');
  }

  const chain = usePolygon ? polygon : mainnet;
  const rpcUrl = usePolygon
    ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;

  // Create viem public client
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  try {
    // Call balanceOf on NFT contract
    const balance = await client.readContract({
      address: nftContractAddress as `0x${string}`,
      abi: ERC721_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });

    const balanceNumber = Number(balance);
    const hasPremiumNFT = balanceNumber > 0;

    return { balance: balanceNumber, hasPremiumNFT };
  } catch (error) {
    console.error('Error calling balanceOf:', error);
    throw new Error(`Failed to verify NFT ownership: ${error.message}`);
  }
}

/**
 * Main request handler
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Allow GET (backwards compat) and POST (agent-key verification)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return createMethodNotAllowedResponse(['GET', 'POST']);
  }

  try {
    const bodyText = req.method === 'POST' ? await req.text() : '';
    const body = bodyText ? JSON.parse(bodyText) : {};
    const serviceAuthorized = req.method === 'POST' && await isServiceAuthorized(req, bodyText);

    // Initialize Supabase client
    const supabase = createSupabaseClient();

    let walletAddress = (body.wallet_address || body.walletAddress) as string | undefined;
    const agentKey = (body.agent_key || body.agentKey) as string | undefined;
    const agentSignature = (body.agent_signature || body.agentSignature) as string | undefined;
    let agentKeyVerified = false;

    if (!serviceAuthorized) {
      // Get authenticated user from JWT
      const authResult = await authenticateUser(req.headers.get('Authorization'), supabase);
      if (!authResult.success) {
        return createAuthErrorResponse(authResult.error!);
      }
      const { user } = authResult;

      // Check rate limit
      const rateLimit = await checkRateLimit(user!.id, RATE_LIMIT_CONFIGS.verifyNft);
      if (!rateLimit.allowed) {
        return corsJsonResponse({
          hasPremiumNFT: false,
          wallet_address: null,
          nft_balance: 0,
          verified_at: new Date().toISOString(),
          cached: false,
          agent_key_verified: false,
          error: 'rate_limited',
        });
      }

      // Get user's verified wallet address
      const { data: walletIdentity, error: walletError } = await supabase
        .from('wallet_identities')
        .select('wallet_address')
        .eq('user_id', user!.id)
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (walletError) {
        console.error('Error fetching wallet identity:', walletError);
        return corsJsonResponse({
          hasPremiumNFT: false,
          wallet_address: null,
          nft_balance: 0,
          verified_at: new Date().toISOString(),
          cached: false,
          agent_key_verified: false,
          error: 'database_error',
        });
      }

      if (!walletIdentity) {
        return corsJsonResponse({
          hasPremiumNFT: false,
          wallet_address: null,
          nft_balance: 0,
          verified_at: new Date().toISOString(),
          cached: false,
          agent_key_verified: false,
          reason: 'no_verified_wallet',
        });
      }

      if (walletAddress && walletAddress.toLowerCase() !== walletIdentity.wallet_address.toLowerCase()) {
        return corsJsonResponse({
          hasPremiumNFT: false,
          wallet_address: walletAddress,
          nft_balance: 0,
          verified_at: new Date().toISOString(),
          cached: false,
          agent_key_verified: false,
          error: 'wallet_mismatch',
        });
      }

      walletAddress = walletAddress ?? walletIdentity.wallet_address;
    }

    if (!walletAddress) {
      return corsJsonResponse({
        hasPremiumNFT: false,
        wallet_address: null,
        nft_balance: 0,
        verified_at: new Date().toISOString(),
        cached: false,
        agent_key_verified: false,
        error: 'wallet_required',
      });
    }

    if (agentKey && agentSignature) {
      try {
        agentKeyVerified = await verifyMessage({
          address: walletAddress as `0x${string}`,
          message: agentKey,
          signature: agentSignature as `0x${string}`,
        });
      } catch (_err) {
        agentKeyVerified = false;
      }
      if (!agentKeyVerified) {
        return corsJsonResponse({
          hasPremiumNFT: false,
          wallet_address: walletAddress,
          nft_balance: 0,
          verified_at: new Date().toISOString(),
          cached: false,
          agent_key_verified: false,
          error: 'agent_key_signature_invalid',
        });
      }
    }

    // Check cache first
    const cached = getCachedVerification(walletAddress);
    if (cached) {
      return corsJsonResponse({
        hasPremiumNFT: cached.hasPremiumNFT,
        wallet_address: walletAddress,
        nft_balance: cached.balance,
        verified_at: new Date().toISOString(),
        cached: true,
        agent_key_verified: agentKeyVerified,
      });
    }

    // Verify NFT ownership via blockchain
    let balance = 0;
    let hasPremiumNFT = false;

    try {
      const result = await verifyNFTOwnership(walletAddress);
      balance = result.balance;
      hasPremiumNFT = result.hasPremiumNFT;

      // Cache the result
      cacheVerification(walletAddress, hasPremiumNFT, balance);
    } catch (error) {
      console.error('NFT verification failed:', error);
      // Fail-safe: return false on verification errors
      return corsJsonResponse({
        hasPremiumNFT: false,
        wallet_address: walletAddress,
        nft_balance: 0,
        verified_at: new Date().toISOString(),
        cached: false,
        agent_key_verified: agentKeyVerified,
        error: 'verification_failed',
      });
    }

    if (!serviceAuthorized) {
      const authResult = await authenticateUser(req.headers.get('Authorization'), supabase);
      if (authResult.success) {
        await supabase
          .from('profiles')
          .update({
            has_premium_nft: hasPremiumNFT,
            nft_verified_at: new Date().toISOString(),
          })
          .eq('id', authResult.user!.id);
      }
    }

    // Return success response
    return corsJsonResponse({
      hasPremiumNFT,
      wallet_address: walletAddress,
      nft_balance: balance,
      verified_at: new Date().toISOString(),
      cached: false,
      agent_key_verified: agentKeyVerified,
    });

  } catch (error) {
    console.error('Unexpected error in verify-nft function:', error);
    // Fail-safe: always return false on errors
    return corsJsonResponse({
      hasPremiumNFT: false,
      wallet_address: null,
      nft_balance: 0,
      verified_at: new Date().toISOString(),
      cached: false,
      agent_key_verified: false,
      error: 'internal_error',
    });
  }
});
