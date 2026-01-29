/**
 * Web3 Nonce Generation Edge Function
 *
 * Purpose: Generate or retrieve an active nonce for wallet signature verification
 *
 * Endpoint: POST /web3-nonce
 *
 * Request Body:
 *   { "wallet_address": "0x..." }
 *
 * Response:
 *   { "nonce": "...", "expires_at": "...", "message": "..." }
 *
 * Security:
 *   - Rate limited (5 requests per minute per IP)
 *   - Idempotent: returns existing active nonce if available
 *   - Nonces expire after 5 minutes
 *   - No authentication required (public endpoint)
 *
 * Author: OmniLink APEX
 * Date: 2026-01-01
 */

import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { encodeHex } from 'https://deno.land/std@0.177.0/encoding/hex.ts';
import { handleCors, corsJsonResponse, isOriginAllowed, buildCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMIT_CONFIGS } from '../_shared/rate-limit.ts';
import { isValidWalletAddress } from '../_shared/validation.ts';
import { createSupabaseClient, createMethodNotAllowedResponse, createInternalErrorResponse } from '../_shared/auth.ts';

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const NONCE_LENGTH = 32; // 32 bytes = 64 hex characters
const MAX_PAYLOAD_BYTES = 8 * 1024; // 8 KB

/**
 * Generate a cryptographically secure random nonce
 */
function generateSecureNonce(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  return encodeHex(randomBytes);
}

/**
 * Create verification message for wallet signing
 */
function createVerificationMessage(walletAddress: string, nonce: string): string {
  return `Welcome to OmniLink APEX!

Sign this message to verify your wallet ownership.

Wallet: ${walletAddress}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`;
}

/**
 * Main request handler
 */
Deno.serve(async (req) => {
  const origin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(origin);

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!isOriginAllowed(origin)) {
    return corsJsonResponse({ error: 'origin_not_allowed' }, 403, origin);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return createMethodNotAllowedResponse(['POST']);
  }

  try {
    // Enforce payload size limit before parsing body
    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return corsJsonResponse({ error: 'payload_too_large', max_bytes: MAX_PAYLOAD_BYTES }, 413, origin);
    }

    // Parse request body with size guard
    const rawBody = await req.text();
    if (rawBody.length === 0) {
      return corsJsonResponse({ error: 'invalid_request', message: 'Request body required' }, 400, origin);
    }
    if (new TextEncoder().encode(rawBody).length > MAX_PAYLOAD_BYTES) {
      return corsJsonResponse({ error: 'payload_too_large', max_bytes: MAX_PAYLOAD_BYTES }, 413, origin);
    }

    const body = JSON.parse(rawBody);
    const { wallet_address } = body;

    const supabase = createSupabaseClient();

    // Require authenticated session
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    if (!token) {
      return corsJsonResponse({ error: 'unauthorized', message: 'Authentication required' }, 401, origin);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return corsJsonResponse({ error: 'unauthorized', message: 'Invalid or expired session' }, 401, origin);
    }

    // Rate limit per authenticated user (persistent via Upstash)
    const rateLimit = await checkRateLimit(user.id, RATE_LIMIT_CONFIGS.web3Nonce);
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(origin, rateLimit);
    }

    // Validate wallet address
    if (!wallet_address || typeof wallet_address !== 'string') {
      return corsJsonResponse({ error: 'invalid_request', message: 'wallet_address is required' }, 400);
    }

    // Normalize and validate address format
    const normalizedAddress = wallet_address.toLowerCase();
    if (!isValidWalletAddress(normalizedAddress)) {
      return corsJsonResponse({ error: 'invalid_address', message: 'Invalid Ethereum wallet address format' }, 400);
    }

    // Check for existing active nonce (idempotency)
    const { data: existingNonce, error: fetchError } = await supabase
      .from('wallet_nonces')
      .select('nonce, expires_at')
      .eq('wallet_address', normalizedAddress)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing nonce:', fetchError);
      return corsJsonResponse({ error: 'database_error', message: 'Failed to check existing nonce' }, 500);
    }

    // Return existing nonce if still valid
    if (existingNonce) {
      const message = createVerificationMessage(normalizedAddress, existingNonce.nonce);
      return corsJsonResponse({
        nonce: existingNonce.nonce,
        expires_at: existingNonce.expires_at,
        message,
        wallet_address: normalizedAddress,
        reused: true,
      });
    }

    // Generate new nonce
    const nonce = generateSecureNonce();
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);

    // Store nonce in database
    const { error: insertError } = await supabase
      .from('wallet_nonces')
      .insert({
        nonce,
        wallet_address: normalizedAddress,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error inserting nonce:', insertError);
      return corsJsonResponse({ error: 'database_error', message: 'Failed to create nonce' }, 500);
    }

    // Create verification message
    const message = createVerificationMessage(normalizedAddress, nonce);

    // Return success response
    return corsJsonResponse({
      nonce,
      expires_at: expiresAt.toISOString(),
      message,
      wallet_address: normalizedAddress,
      reused: false,
    });

  } catch (error) {
    console.error('Unexpected error in web3-nonce function:', error);
    return createInternalErrorResponse('An unexpected error occurred');
  }
});
