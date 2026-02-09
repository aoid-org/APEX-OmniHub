/**
 * Web3 Signature Verification Edge Function
 *
 * Purpose: Verify wallet signature and link wallet to authenticated user
 *
 * Endpoint: POST /web3-verify
 *
 * Request Body:
 *   {
 *     "wallet_address": "0x...",
 *     "signature": "0x...",
 *     "message": "..."
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "wallet_identity_id": "...",
 *     "wallet_address": "...",
 *     "chain_id": 1
 *   }
 *
 * Security:
 *   - Requires authenticated session
 *   - Rate limited (10 verification attempts per hour per user)
 *   - Nonce must be unused and not expired
 *   - Signature verification using viem
 *   - Audit logging for all attempts
 *   - Fail closed on verification errors
 *
 * Author: OmniLink APEX
 * Date: 2026-01-01
 */

import { verifyMessage, verifyTypedData } from 'https://esm.sh/viem@2.21.54';
import { parseSiweMessage } from 'https://esm.sh/viem@2.21.54/siwe';
// Removed unused isOriginAllowed
// Removed unused isOriginAllowed, buildCorsHeaders
import { handleCors, corsJsonResponse } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMIT_CONFIGS } from '../_shared/rate-limit.ts';
import { isValidWalletAddress, isValidSignature, validateRequestBody } from '../_shared/validation.ts';
import { createSupabaseClient, authenticateUser, createAuthErrorResponse, createMethodNotAllowedResponse, createInternalErrorResponse } from '../_shared/auth.ts';

// Custom Error Class
class Web3VerificationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'Web3VerificationError';
  }
}

/**
 * Resolve origin from a URI string
 */
function resolveOriginFromUri(uri: string): string {
  const url = new URL(uri);
  return `${url.protocol}//${url.host}`;
}

// ... (existing code) ...

Deno.serve(async (req) => {
  // Removed unused requestOrigin
  // Removed unused corsHeaders assignment
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') return createMethodNotAllowedResponse(['POST']);

  try {
    const supabase = createSupabaseClient();
    const authResult = await authenticateUser(req.headers.get('Authorization'), supabase);
    if (!authResult.success) return createAuthErrorResponse(authResult.error!);
    const { user } = authResult;

    const rateLimit = await checkRateLimit(user!.id, RATE_LIMIT_CONFIGS.web3Verify);
    if (!rateLimit.allowed) {
      await logAuditEvent(supabase, user!.id, 'wallet_verify_rate_limited', 'unknown', { retry_after: Math.ceil(rateLimit.resetIn / 1000) });
      return rateLimitExceededResponse(req.headers.get('origin'), rateLimit);
    }

    try {
      const { body, normalizedAddress } = await validateVerificationRequest(req, user!, supabase);
      const { message } = body;
      
      // SIWE Validation Logic
      // Extract nonce
      const nonce = extractNonceFromMessage(message);
      if (!nonce) {
        await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'nonce_not_found_in_message' });
        throw new Web3VerificationError(400, 'invalid_message', 'Message does not contain a valid nonce');
      }

      // SIWE Parsing & Validation
      let siweMessage;
      try { siweMessage = parseSiweMessage(message); } 
      catch (e: any) { 
        await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'siwe_parse_failed', error: e.message });
        throw new Web3VerificationError(400, 'invalid_message', 'Failed to parse SIWE message');
      }

      // SIWE Checks
      const messageNonce = siweMessage.nonce || nonce;
      const resolvedChainId = siweMessage.chainId || 1;
      
      // Verify Nonce DB
      const { data: nonceRecord } = await supabase.from('wallet_nonces').select('*').eq('nonce', messageNonce).maybeSingle();
      if (!nonceRecord) {
         await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'nonce_not_found', nonce: messageNonce });
         throw new Web3VerificationError(400, 'invalid_nonce', 'Nonce not found');
      }
      
      const isValidSiwe = validateSiweMessage({
        message: siweMessage,
        address: normalizedAddress as `0x${string}`,
        domain: new URL(siweMessage.uri).host,
        nonce: nonceRecord.nonce,
        time: new Date(),
      });

      if (!isValidSiwe) throw new Web3VerificationError(400, 'invalid_message', 'SIWE validation failed');

      // Verify Signature
      await verifySignatureStrategy(body, normalizedAddress, user!, supabase);

      // Mark nonce used
      await supabase.from('wallet_nonces').update({ used_at: new Date().toISOString() }).eq('nonce', messageNonce);

      // Register Identity
      const walletIdentity = await registerWalletIdentity({ resolvedChainId, signature: body.signature, message }, normalizedAddress, user!, supabase, req);

      return corsJsonResponse({
        success: true,
        wallet_identity_id: walletIdentity.id,
        wallet_address: normalizedAddress,
        chain_id: resolvedChainId,
        verified_at: walletIdentity.verified_at,
      });

    } catch (err: any) {
      if (err instanceof Web3VerificationError) {
        return corsJsonResponse({ error: err.code, message: err.message }, err.status);
      }
      throw err;
    }

  } catch (error) {
    console.error('Unexpected error in web3-verify function:', error);
    return createInternalErrorResponse('An unexpected error occurred');
  }
});
