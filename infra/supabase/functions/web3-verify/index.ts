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
  const match = /Nonce:\s*([a-f0-9]+)/i.exec(message);
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
 * Validate basic request fields (address, signature, nonce, message/typedData presence).
 */
async function validateInputFields(
  supabase: unknown,
  userId: string,
  body: Record<string, unknown>
): Promise<{ ok: false; response: Response } | { ok: true; normalizedAddress: string; nonce: string }> {
  const { wallet_address, signature, message, typedData } = body;

  const validation = validateRequestBody(body, ['wallet_address', 'signature']);
  if (!validation.valid) {
    return { ok: false, response: corsJsonResponse({ error: 'invalid_request', message: validation.errors[0] }, 400) };
  }

  if (!message && !typedData) {
    return { ok: false, response: corsJsonResponse({ error: 'invalid_request', message: 'Either message (personal_sign) or typedData (EIP-712) must be provided' }, 400) };
  }

  const normalizedAddress = (wallet_address as string).toLowerCase();
  if (!isValidWalletAddress(normalizedAddress)) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'invalid_address_format' });
    return { ok: false, response: corsJsonResponse({ error: 'invalid_address', message: 'Invalid Ethereum wallet address format' }, 400) };
  }

  if (!isValidSignature(signature as string)) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'invalid_signature_format' });
    return { ok: false, response: corsJsonResponse({ error: 'invalid_signature', message: 'Invalid signature format' }, 400) };
  }

  const nonce = extractNonceFromMessage(message as string);
  if (!nonce) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'nonce_not_found_in_message' });
    return { ok: false, response: corsJsonResponse({ error: 'invalid_message', message: 'Message does not contain a valid nonce' }, 400) };
  }

  return { ok: true, normalizedAddress, nonce };
}

/**
 * Validate SIWE message origin, domain, and chain ID.
 */
async function validateSiweOriginAndChain(
  supabase: unknown,
  userId: string,
  siweMsg: ReturnType<typeof parseSiweMessage>,
  resolvedChainId: number,
  normalizedAddress: string,
  requestOrigin: string | null,
  corsHeaders: HeadersInit
): Promise<{ ok: false; response: Response } | { ok: true; expectedDomain: string }> {
  const corsJson = (data: unknown, status = 400) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (!siweMsg.domain || !siweMsg.uri) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'missing_siwe_fields' });
    return { ok: false, response: corsJson({ error: 'invalid_message', message: 'Missing required SIWE fields' }) };
  }

  let messageOrigin: string;
  try {
    messageOrigin = resolveOriginFromUri(siweMsg.uri);
  } catch {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'invalid_siwe_uri' });
    return { ok: false, response: corsJson({ error: 'invalid_message', message: 'SIWE uri must be a valid URL' }) };
  }

  const expectedDomain = new URL(siweMsg.uri).host;
  if (siweMsg.domain !== expectedDomain) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'siwe_domain_mismatch' });
    return { ok: false, response: corsJson({ error: 'invalid_message', message: 'SIWE domain mismatch' }) };
  }

  if (requestOrigin && requestOrigin !== messageOrigin) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'origin_mismatch' });
    return { ok: false, response: corsJson({ error: 'invalid_message', message: 'Origin does not match SIWE uri' }) };
  }

  if (!isOriginAllowed(messageOrigin)) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'origin_not_allowed' });
    return { ok: false, response: corsJson({ error: 'forbidden', message: 'Origin not allowed' }, 403) };
  }

  if (!siweMsg.chainId || siweMsg.chainId !== resolvedChainId) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'chain_id_mismatch', chain_id: resolvedChainId, message_chain_id: siweMsg.chainId });
    return { ok: false, response: corsJson({ error: 'invalid_message', message: 'SIWE chainId mismatch' }) };
  }

  return { ok: true, expectedDomain };
}

/**
 * Validate nonce record exists, is unused, and not expired.
 */
async function validateNonceRecord(
  supabase: unknown,
  userId: string,
  messageNonce: string,
  normalizedAddress: string,
  resolvedChainId: number,
  siweMsg: ReturnType<typeof parseSiweMessage>,
  corsHeaders: HeadersInit
): Promise<{ ok: false; response: Response } | { ok: true; nonceRecord: Record<string, unknown>; expiresAt: Date }> {
  const corsJson = (data: unknown, status = 400) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { data: nonceRecord, error: nonceError } = await supabase
    .from('wallet_nonces')
    .select('*')
    .eq('nonce', messageNonce)
    .eq('wallet_address', normalizedAddress)
    .eq('chain_id', resolvedChainId)
    .is('used_at', null)
    .maybeSingle();

  if (nonceError || !nonceRecord) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'nonce_not_found', nonce: messageNonce });
    return { ok: false, response: corsJsonResponse({ error: 'invalid_nonce', message: 'Nonce not found or already used' }, 400) };
  }

  const expiresAt = new Date(nonceRecord.expires_at);
  if (expiresAt < new Date()) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'nonce_expired', nonce: messageNonce, expires_at: nonceRecord.expires_at });
    return { ok: false, response: corsJsonResponse({ error: 'nonce_expired', message: 'Nonce has expired, please request a new one' }, 400) };
  }

  const expirationTime = siweMsg.expirationTime;
  if (!expirationTime || expirationTime.getTime() !== expiresAt.getTime()) {
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'expiration_mismatch', nonce: messageNonce });
    return { ok: false, response: corsJson({ error: 'invalid_message', message: 'SIWE expiration mismatch' }) };
  }

  return { ok: true, nonceRecord, expiresAt };
}

/**
 * Verify the wallet signature (EIP-712 or personal_sign).
 */
async function verifyWalletSignature(
  supabase: unknown,
  userId: string,
  normalizedAddress: string,
  body: Record<string, unknown>
): Promise<{ ok: false; response: Response } | { ok: true; isValid: boolean }> {
  const { signature, message, typedData, domain, types, primaryType } = body;

  try {
    if (typedData && domain && types && primaryType) {
      const isValid = await verifyTypedData({
        address: normalizedAddress as `0x${string}`,
        domain, types, primaryType,
        message: typedData,
        signature: signature as `0x${string}`,
      });
      await logAuditEvent(supabase, userId, 'wallet_verify_typed_data_attempt', normalizedAddress, { verification_type: 'eip712', primary_type: primaryType });
      return { ok: true, isValid };
    }
    if (message) {
      const isValid = await verifyMessage({
        address: normalizedAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      await logAuditEvent(supabase, userId, 'wallet_verify_personal_sign_attempt', normalizedAddress, { verification_type: 'personal_sign' });
      return { ok: true, isValid };
    }
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'no_verification_data' });
    return { ok: false, response: corsJsonResponse({ error: 'invalid_request', message: 'No verification data provided' }, 400) };
  } catch (error) {
    console.error('Signature verification error:', error);
    await logAuditEvent(supabase, userId, 'wallet_verify_failed', normalizedAddress, { reason: 'signature_verification_error', error: error.message });
    return { ok: false, response: corsJsonResponse({ error: 'verification_failed', message: 'Signature verification failed' }, 400) };
  }
}

/**
 * Main request handler
 */
Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(requestOrigin);

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return createMethodNotAllowedResponse(['POST']);
  }

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

    const body = await req.json();

    const inputResult = await validateInputFields(supabase, user!.id, body);
    if (!inputResult.ok) return inputResult.response;
    const { normalizedAddress, nonce } = inputResult;

    let siweMessage: ReturnType<typeof parseSiweMessage>;
    try {
      siweMessage = parseSiweMessage(body.message);
    } catch (parseError) {
      await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'siwe_parse_failed', error: parseError instanceof Error ? parseError.message : 'Unknown parse error' });
      return corsJsonResponse({ error: 'invalid_message', message: 'Failed to parse SIWE message' }, 400);
    }

    const messageNonce = siweMessage.nonce || nonce;
    const resolvedChainId = siweMessage.chainId || 1;

    const originResult = await validateSiweOriginAndChain(supabase, user!.id, siweMessage, resolvedChainId, normalizedAddress, requestOrigin, corsHeaders);
    if (!originResult.ok) return originResult.response;
    const { expectedDomain } = originResult;

    const nonceResult = await validateNonceRecord(supabase, user!.id, messageNonce, normalizedAddress, resolvedChainId, siweMessage, corsHeaders);
    if (!nonceResult.ok) return nonceResult.response;

    const isValidSiwe = validateSiweMessage({
      message: siweMessage,
      address: normalizedAddress as `0x${string}`,
      domain: expectedDomain,
      nonce: nonceResult.nonceRecord.nonce,
      time: new Date(),
    });

    if (!isValidSiwe) {
      await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'siwe_validation_failed', nonce: messageNonce });
      return new Response(JSON.stringify({ error: 'invalid_message', message: 'SIWE validation failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sigResult = await verifyWalletSignature(supabase, user!.id, normalizedAddress, body);
    if (!sigResult.ok) return sigResult.response;

    if (!sigResult.isValid) {
      await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'invalid_signature' });
      return corsJsonResponse({ error: 'invalid_signature', message: 'Signature verification failed' }, 400);
    }

    await supabase
      .from('wallet_nonces')
      .update({ used_at: new Date().toISOString() })
      .eq('nonce', messageNonce)
      .eq('chain_id', resolvedChainId);

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { data: walletIdentity, error: upsertError } = await supabase
      .from('wallet_identities')
      .upsert(
        {
          user_id: user!.id,
          wallet_address: normalizedAddress,
          chain_id: resolvedChainId,
          signature: body.signature,
          message: body.message,
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
      await logAuditEvent(supabase, user!.id, 'wallet_verify_failed', normalizedAddress, { reason: 'database_error', error: upsertError.message });
      return corsJsonResponse({ error: 'database_error', message: 'Failed to save wallet identity' }, 500);
    }

    await logAuditEvent(supabase, user!.id, 'wallet_verified', normalizedAddress, { wallet_identity_id: walletIdentity.id, chain_id: resolvedChainId, ip: clientIp });

    return corsJsonResponse({
      success: true,
      wallet_identity_id: walletIdentity.id,
      wallet_address: normalizedAddress,
      chain_id: resolvedChainId,
      verified_at: walletIdentity.verified_at,
    });
  } catch (error) {
    console.error('Unexpected error in web3-verify function:', error);
    return createInternalErrorResponse('An unexpected error occurred');
  }
});
