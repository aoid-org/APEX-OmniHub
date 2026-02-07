import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { buildCorsHeaders, handlePreflight, corsErrorResponse } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  try {
    const { walletAddress, chainId, contractAddress, tokenId } = await req.json();

    // NFT Verification Logic
    // This implementation is a stub - production requires actual RPC calls
    // Implementation roadmap:
    // 1. Use Alchemy/Infura RPC to query ERC-721/ERC-1155 balanceOf
    // 2. Verify ownership via eth_call to contract.balanceOf(walletAddress)
    // 3. Cache results in Supabase for performance
    // 4. Add support for multiple chains (Ethereum, Polygon, Optimism, Arbitrum)
    const hasNFT = await verifyNFTOwnership(
      walletAddress,
      chainId || 1,
      contractAddress || '0x0000000000000000000000000000000000000000',
      tokenId
    );

    const headers = buildCorsHeaders(origin);
    return new Response(
      JSON.stringify({
        hasNFT,
        walletAddress,
        chainId: chainId || 1,
        contractAddress,
        verifiedAt: new Date().toISOString(),
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return corsErrorResponse(
      'VERIFICATION_ERROR',
      error.message,
      500,
      origin
    );
  }
});

/**
 * Verify NFT ownership via blockchain RPC
 *
 * @param walletAddress - Ethereum address to check
 * @param chainId - Chain ID (1 = Ethereum mainnet, 137 = Polygon, etc.)
 * @param contractAddress - NFT contract address
 * @param tokenId - Optional token ID for specific NFT verification
 * @returns Promise<boolean> - true if wallet owns NFT, false otherwise
 *
 * Production implementation would:
 * 1. Call Alchemy/Infura getNFTs API or contract.balanceOf via eth_call
 * 2. For ERC-721: Check if balanceOf(walletAddress) > 0
 * 3. For ERC-1155: Check if balanceOf(walletAddress, tokenId) > 0
 * 4. Cache results with TTL for performance
 */
async function verifyNFTOwnership(
  walletAddress: string,
  chainId: number,
  contractAddress: string,
  tokenId?: string
): Promise<boolean> {
  // Stub implementation - returns true for demo
  // In production, replace with actual RPC call:
  //
  // const rpcUrl = getRPCUrl(chainId);
  // const response = await fetch(rpcUrl, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     jsonrpc: '2.0',
  //     id: 1,
  //     method: 'eth_call',
  //     params: [
  //       {
  //         to: contractAddress,
  //         data: encodeBalanceOfCall(walletAddress, tokenId)
  //       },
  //       'latest'
  //     ]
  //   })
  // });
  // const result = await response.json();
  // return decodeBalanceOfResult(result.result) > 0;

  console.log(
    `NFT verification stub: ${walletAddress} on chain ${chainId} at ${contractAddress} (token: ${tokenId || 'N/A'})`
  );

  return true; // Always returns true for demo purposes
}
