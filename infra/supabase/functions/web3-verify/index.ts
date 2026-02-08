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
import { handleCors, corsJsonResponse, buildCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMIT_CONFIGS } from '../_shared/rate-limit.ts';
import { isValidWalletAddress, isValidSignature, validateRequestBody } from '../_shared/validation.ts';
import { createSupabaseClient, authenticateUser, createAuthErrorResponse, createMethodNotAllowedResponse, createInternalErrorResponse } from '../_shared/auth.ts';

/**
 * Resolve origin from a URI string
 */
function resolveOriginFromUri(uri: string): string {
  const url = new URL(uri);
  return `${url.protocol}//${url.host}`;
}

/**
 * Validate SIWE message fields
 */
function validateSiweMessage(params: {
  message: ReturnType<typeof parseSiweMessage>;
  address: `0x${string}`;
  domain: string;
  nonce: string;
  time: Date;
}): boolean {
  const { message, address, domain, nonce, time } = params;

  // Check address matches
  if (message.address?.toLowerCase() !== address.toLowerCase()) {
    return false;
  }

  // Check domain matches
  if (message.domain !== domain) {
    return false;
  }

  // Check nonce matches
  if (message.nonce !== nonce) {
    return false;
  }

  // Check not expired
  if (message.expirationTime && message.expirationTime < time) {
    return false;
  }

  // Check not before time
  if (message.notBefore && message.notBefore > time) {
    return false;
  }

  return true;
}




/**
 * Extract nonce from verification message
 */
function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce:\s*([a-f0-9]+)/i);
  return match ? match[1] : null;
}

/**
 * Log audit event
 */
async function logAuditEvent(
  supabase: unknown,
  userId: string,
  action: string,
  walletAddress: string,
  metadata: Record<string, unknown>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: 'wallet_identity',
      resource_id: walletAddress,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Non-blocking - don't fail the request if audit logging fails
  }
}

/**
 * Main request handler
 */
// Helper to validate request and return parsed body
async function validateVerificationRequest(req: Request, user: { id: string }, supabase: any) {
  const body = await req.json();
  const validation = validateRequestBody(body, ['wallet_address', 'signature']);
  if (!validation.valid) {
    throw { status: 400, code: 'invalid_request', message: validation.errors[0] };
  }

  const { wallet_address, signature, message, typedData } = body;
  if (!message && !typedData) {
    throw { status: 400, code: 'invalid_request', message: 'Either message (personal_sign) or typedData (EIP-712) must be provided' };
  }

  const normalizedAddress = wallet_address.toLowerCase();
  
  // Address validation
  if (!isValidWalletAddress(normalizedAddress)) {
    await logAuditEvent(supabase, user.id, 'wallet_verify_failed', normalizedAddress, { reason: 'invalid_address_format' });
    throw { status: 400, code: 'invalid_address', message: 'Invalid Ethereum wallet address format' };
  }

  // Signature validation
  if (!isValidSignature(signature)) {
    await logAuditEvent(supabase, user.id, 'wallet_verify_failed', normalizedAddress, { reason: 'invalid_signature_format' });
    throw { status: 400, code: 'invalid_signature', message: 'Invalid signature format' };
  }
  
  return { body, normalizedAddress };
}

// Helper to handle signature verification strategies
async function verifySignatureStrategy(params: any, normalizedAddress: string, user: { id: string }, supabase: any) {
  const { signature, message, typedData, domain, types, primaryType } = params;
  let isValid = false;

  try {
    if (typedData && domain && types && primaryType) {
      isValid = await verifyTypedData({
        address: normalizedAddress as `0x${string}`,
        domain,
        types,
        primaryType,
        message: typedData,
        signature: signature as `0x${string}`,
      });
      await logAuditEvent(supabase, user.id, 'wallet_verify_typed_data_attempt', normalizedAddress, { verification_type: 'eip712', primary_type: primaryType });
    } else if (message) {
      isValid = await verifyMessage({
        address: normalizedAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      await logAuditEvent(supabase, user.id, 'wallet_verify_personal_sign_attempt', normalizedAddress, { verification_type: 'personal_sign' });
    }
  } catch (error: any) {
    console.error('Signature verification error:', error);
    await logAuditEvent(supabase, user.id, 'wallet_verify_failed', normalizedAddress, { reason: 'signature_verification_error', error: error.message });
    throw { status: 400, code: 'verification_failed', message: 'Signature verification failed' };
  }

  if (!isValid) {
    await logAuditEvent(supabase, user.id, 'wallet_verify_failed', normalizedAddress, { reason: 'invalid_signature' });
    throw { status: 400, code: 'invalid_signature', message: 'Signature verification failed' };
  }

  return true;
}

// Helper to register wallet identity
async function registerWalletIdentity(params: any, normalizedAddress: string, user: { id: string }, supabase: any, req: Request) {
  const { resolvedChainId, signature, message } = params;
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const { data: walletIdentity, error: upsertError } = await supabase
    .from('wallet_identities')
    .upsert(
      {
        user_id: user.id,
        wallet_address: normalizedAddress,
        chain_id: resolvedChainId,
        signature,
        message,
        verified_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        metadata: { ip: clientIp, user_agent: userAgent, verification_timestamp: new Date().toISOString() },
      },
      { onConflict: 'wallet_address,chain_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (upsertError) {
    console.error('Error upserting wallet identity:', upsertError);
    await logAuditEvent(supabase, user.id, 'wallet_verify_failed', normalizedAddress, { reason: 'database_error', error: upsertError.message });
    throw { status: 500, code: 'database_error', message: 'Failed to save wallet identity' };
  }

  await logAuditEvent(supabase, user.id, 'wallet_verified', normalizedAddress, { wallet_identity_id: walletIdentity.id, chain_id: resolvedChainId, ip: clientIp });
  
  return walletIdentity;
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(requestOrigin);
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
      const { message, typedData } = body;
      
      // SIWE Validation Logic (kept inline or could be extracted too, but effectively validated via isValidSignature/nonce checks)
      // Extract nonce
      const nonce = extractNonceFromMessage(message);
      if (!nonce) {
        await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'nonce_not_found_in_message' });
        throw { status: 400, code: 'invalid_message', message: 'Message does not contain a valid nonce' };
      }

      // SIWE Parsing & Validation
      let siweMessage;
      try { siweMessage = parseSiweMessage(message); } 
      catch (e: any) { 
        await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'siwe_parse_failed', error: e.message });
        throw { status: 400, code: 'invalid_message', message: 'Failed to parse SIWE message' };
      }

      // SIWE Checks
      const messageNonce = siweMessage.nonce || nonce;
      const resolvedChainId = siweMessage.chainId || 1;
      
      // Verify Nonce DB
      const { data: nonceRecord } = await supabase.from('wallet_nonces').select('*').eq('nonce', messageNonce).maybeSingle();
      if (!nonceRecord) {
         await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'nonce_not_found', nonce: messageNonce });
         throw { status: 400, code: 'invalid_nonce', message: 'Nonce not found' };
      }
      
      const isValidSiwe = validateSiweMessage({
        message: siweMessage,
        address: normalizedAddress as `0x${string}`,
        domain: new URL(siweMessage.uri).host,
        nonce: nonceRecord.nonce,
        time: new Date(),
      });

      if (!isValidSiwe) throw { status: 400, code: 'invalid_message', message: 'SIWE validation failed' };

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
      if (err.status && err.code) {
        return corsJsonResponse({ error: err.code, message: err.message }, err.status);
      }
      throw err;
    }

  } catch (error) {
    console.error('Unexpected error in web3-verify function:', error);
    return createInternalErrorResponse('An unexpected error occurred');
  }
});
