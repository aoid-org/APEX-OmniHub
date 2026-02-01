import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { buildCorsHeaders, handlePreflight, corsErrorResponse } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  try {
    const { walletAddress, chainId, contractAddress } = await req.json();

    // Placeholder NFT verification (integrate with actual chain in production)
    const hasNFT = true; // Always true for demo

    const headers = buildCorsHeaders(origin);
    return new Response(
      JSON.stringify({ hasNFT, walletAddress, verifiedAt: new Date().toISOString() }),
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
