/**
 * Alchemy Webhook Event Processor Edge Function
 *
 * Purpose: Process blockchain events from Alchemy webhooks and update user state
 *
 * Endpoint: POST /alchemy-webhook
 *
 * Request Body: Alchemy webhook payload
 *   {
 *     "webhookId": "...",
 *     "id": "...",
 *     "createdAt": "...",
 *     "type": "NFT_ACTIVITY",
 *     "event": {
 *       "network": "MATIC_MAINNET",
 *       "activity": [{
 *         "fromAddress": "0x...",
 *         "toAddress": "0x...",
 *         "contractAddress": "0x...",
 *         "tokenId": "1",
 *         "category": "erc721",
 *         "log": {
 *           "transactionHash": "0x...",
 *           "logIndex": "0x..."
 *         }
 *       }]
 *     }
 *   }
 *
 * Response:
 *   { "success": true, "processed": number, "skipped": number }
 *
 * Security:
 *   - Verifies Alchemy webhook signature (X-Alchemy-Signature header)
 *   - Idempotent: uses (txHash + logIndex) as unique key
 *   - Uses service role for database access
 *   - Validates contract address matches MEMBERSHIP_NFT_ADDRESS
 *   - Fails closed on signature verification errors
 *
 * Environment Variables:
 *   - ALCHEMY_WEBHOOK_SIGNING_KEY
 *   - MEMBERSHIP_NFT_ADDRESS
 *
 * Author: OmniLink APEX
 * Date: 2026-01-01
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

/**
 * Verify Alchemy webhook signature
 */
async function verifyAlchemySignature(
  body: string,
  signature: string,
  signingKey: string
): Promise<boolean> {
  try {
    // Alchemy uses HMAC-SHA256
    const hmac = createHmac('sha256', signingKey);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    console.error('Signature verification error');
    return false;
  }
}

/**
 * NFT Activity Event from Alchemy
 */
interface AlchemyNFTActivity {
  fromAddress: string;
  toAddress: string;
  contractAddress: string;
  tokenId: string;
  category: string;
  log: {
    transactionHash: string;
    logIndex: string;
    blockNumber?: string;
  };
}

interface AlchemyWebhookPayload {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string;
  event: {
    network: string;
    activity: AlchemyNFTActivity[];
  };
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Update NFT access for all wallets matching the given address
 */
async function updateNFTAccessForWallets(
  supabase: unknown,
  walletAddress: string,
  hasPremiumNft: boolean,
  direction: string
): Promise<void> {
  const { data: wallets } = await supabase
    .from('wallet_identities')
    .select('user_id')
    .eq('wallet_address', walletAddress);

  if (!wallets || wallets.length === 0) return;

  for (const wallet of wallets) {
    await supabase
      .from('profiles')
      .update({
        has_premium_nft: hasPremiumNft,
        nft_verified_at: new Date().toISOString(),
      })
      .eq('id', wallet.user_id);

    console.log(`${direction} NFT access for user ${wallet.user_id}`);
  }
}

/**
 * Process a single NFT transfer event
 */
async function processNFTTransfer(
  supabase: unknown,
  activity: AlchemyNFTActivity,
  membershipNFTAddress: string
): Promise<{ success: boolean; reason?: string }> {
  const { fromAddress, toAddress, contractAddress, tokenId, log } = activity;

  if (contractAddress.toLowerCase() !== membershipNFTAddress.toLowerCase()) {
    return { success: false, reason: 'contract_mismatch' };
  }

  const eventId = `${log.transactionHash}-${log.logIndex}`;

  const { data: existingEvent } = await supabase
    .from('chain_tx_log')
    .select('id, status')
    .eq('id', eventId)
    .maybeSingle();

  if (existingEvent) {
    return { success: true, reason: 'already_processed' };
  }

  await supabase
    .from('chain_tx_log')
    .upsert({
      id: eventId,
      tx_hash: log.transactionHash,
      status: 'pending',
      metadata: {
        from: fromAddress,
        to: toAddress,
        contract: contractAddress,
        token_id: tokenId,
        log_index: log.logIndex,
        block_number: log.blockNumber,
      },
    });

  try {
    const normalizedFrom = fromAddress.toLowerCase();
    const normalizedTo = toAddress.toLowerCase();

    if (normalizedFrom !== ZERO_ADDRESS) {
      await updateNFTAccessForWallets(supabase, normalizedFrom, false, 'Removed');
    }

    if (normalizedTo !== ZERO_ADDRESS) {
      await updateNFTAccessForWallets(supabase, normalizedTo, true, 'Granted');
    }

    await supabase
      .from('chain_tx_log')
      .update({ status: 'confirmed' })
      .eq('id', eventId);

    return { success: true };
  } catch (error) {
    console.error('Error processing NFT transfer:', error);

    await supabase
      .from('chain_tx_log')
      .update({
        status: 'failed',
        metadata: { error: error.message },
      })
      .eq('id', eventId);

    return { success: false, reason: 'processing_error' };
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Validate webhook environment configuration and request headers.
 * Returns either a Response (on failure) or the validated config.
 */
async function validateWebhookRequest(req: Request): Promise<
  | { ok: false; response: Response }
  | { ok: true; signingKey: string; membershipNFTAddress: string; signature: string }
> {
  const signingKey = Deno.env.get('ALCHEMY_WEBHOOK_SIGNING_KEY');
  if (!signingKey) {
    console.error('ALCHEMY_WEBHOOK_SIGNING_KEY not configured');
    return { ok: false, response: jsonResponse({ error: 'configuration_error', message: 'Webhook signing key not configured' }) };
  }

  const membershipNFTAddress = Deno.env.get('MEMBERSHIP_NFT_ADDRESS');
  if (!membershipNFTAddress) {
    console.error('MEMBERSHIP_NFT_ADDRESS not configured');
    return { ok: false, response: jsonResponse({ error: 'configuration_error', message: 'NFT contract address not configured' }) };
  }

  const signature = req.headers.get('x-alchemy-signature');
  if (!signature) {
    console.error('Missing X-Alchemy-Signature header');
    return { ok: false, response: jsonResponse({ error: 'unauthorized', message: 'Missing signature header' }, 401) };
  }

  return { ok: true, signingKey, membershipNFTAddress, signature };
}

function tallyResult(result: { success: boolean; reason?: string }): 'processed' | 'skipped' {
  if (result.success && result.reason !== 'already_processed') return 'processed';
  if (!result.success) console.error(`Failed to process activity: ${result.reason}`);
  return 'skipped';
}

/**
 * Main request handler
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed', message: 'Only POST requests are allowed' }, 405);
  }

  try {
    const demoMode = Deno.env.get('DEMO_MODE')?.toLowerCase() === 'true';
    if (demoMode) {
      return jsonResponse({ demo: true, ignored: true });
    }

    const validation = await validateWebhookRequest(req);
    if (!validation.ok) return validation.response;

    const { signingKey, membershipNFTAddress, signature } = validation;
    const rawBody = await req.text();

    const isValidSignature = await verifyAlchemySignature(rawBody, signature, signingKey);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return jsonResponse({ error: 'unauthorized', message: 'Invalid webhook signature' }, 401);
    }

    let payload: AlchemyWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return jsonResponse({ error: 'invalid_payload', message: 'Invalid JSON payload' }, 400);
    }

    if (payload.type !== 'NFT_ACTIVITY') {
      return jsonResponse({ success: true, processed: 0, skipped: 1, reason: 'unsupported_type' });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const activities = payload.event.activity || [];
    let processed = 0;
    let skipped = 0;

    for (const activity of activities) {
      const result = await processNFTTransfer(supabase, activity, membershipNFTAddress);
      if (tallyResult(result) === 'processed') {
        processed++;
      } else {
        skipped++;
      }
    }

    return jsonResponse({ success: true, webhook_id: payload.webhookId, processed, skipped, total: activities.length });
  } catch (error) {
    console.error('Unexpected error in alchemy-webhook function:', error);
    return jsonResponse({ success: false, error: 'internal_error', message: 'An unexpected error occurred' });
  }
});
