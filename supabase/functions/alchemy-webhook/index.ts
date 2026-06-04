/**
 * Alchemy Webhook Event Processor Edge Function (Optimized)
 *
 * Purpose: Process blockchain events from Alchemy webhooks and update user state
 * Optimized: Uses batching to minimize database roundtrips (prevents N+1)
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from '../_shared/rate-limit.ts';

/**
 * Verify Alchemy webhook signature
 */
async function verifyAlchemySignature(
  body: string,
  signature: string,
  signingKey: string
): Promise<boolean> {
  try {
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

/**
 * Process a batch of NFT transfer events
 */
async function processNFTTransfersBatch(
  supabase: SupabaseClient,
  activities: AlchemyNFTActivity[],
  membershipNFTAddress: string
): Promise<{ processed: number; skipped: number }> {
  // 1. Filter for our contract and generate IDs
  const validActivities = activities.filter(
    (a) => a.contractAddress.toLowerCase() === membershipNFTAddress.toLowerCase()
  );

  if (validActivities.length === 0) {
    return { processed: 0, skipped: activities.length };
  }

  const activityWithIds = validActivities.map((a) => ({
    ...a,
    eventId: `${a.log.transactionHash}-${a.log.logIndex}`,
  }));

  // 2. Batch check for already processed events
  const eventIds = activityWithIds.map((a) => a.eventId);
  const { data: existingEvents } = await supabase
    .from('chain_tx_log')
    .select('id')
    .in('id', eventIds);

  const existingIds = new Set((existingEvents || []).map((e) => e.id));
  const newActivities = activityWithIds.filter((a) => !existingIds.has(a.eventId));

  if (newActivities.length === 0) {
    return { processed: 0, skipped: activities.length };
  }

  // 3. Record all new events as 'pending' in one batch
  const pendingLogs = newActivities.map((a) => ({
    id: a.eventId,
    tx_hash: a.log.transactionHash,
    status: 'pending',
    metadata: {
      from: a.fromAddress,
      to: a.toAddress,
      contract: a.contractAddress,
      token_id: a.tokenId,
      log_index: a.log.logIndex,
      block_number: a.log.blockNumber,
    },
  }));

  await supabase.from('chain_tx_log').upsert(pendingLogs);

  try {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const allAddresses = new Set<string>();

    newActivities.forEach((a) => {
      if (a.fromAddress.toLowerCase() !== zeroAddress) {
        allAddresses.add(a.fromAddress.toLowerCase());
      }
      if (a.toAddress.toLowerCase() !== zeroAddress) {
        allAddresses.add(a.toAddress.toLowerCase());
      }
    });

    // 4. Batch lookup wallet identities
    const { data: wallets } = await supabase
      .from('wallet_identities')
      .select('wallet_address, user_id')
      .in('wallet_address', Array.from(allAddresses));

    // Map address to list of users
    const addressToUsers: Record<string, string[]> = {};
    (wallets || []).forEach((w) => {
      const addr = w.wallet_address.toLowerCase();
      if (!addressToUsers[addr]) addressToUsers[addr] = [];
      addressToUsers[addr].push(w.user_id);
    });

    // 5. Determine final state for each user in this batch
    // We process activities in order to respect chronological sequence
    const userFinalState = new Map<string, boolean>();

    newActivities.forEach((a) => {
      const fromAddr = a.fromAddress.toLowerCase();
      const toAddr = a.toAddress.toLowerCase();

      if (fromAddr !== zeroAddress && addressToUsers[fromAddr]) {
        addressToUsers[fromAddr].forEach((userId) => {
          userFinalState.set(userId, false);
        });
      }

      if (toAddr !== zeroAddress && addressToUsers[toAddr]) {
        addressToUsers[toAddr].forEach((userId) => {
          userFinalState.set(userId, true);
        });
      }
    });

    // 6. Batch update profiles
    const usersToRevoke = Array.from(userFinalState.entries())
      .filter(([_, hasNft]) => !hasNft)
      .map(([userId]) => userId);

    const usersToGrant = Array.from(userFinalState.entries())
      .filter(([_, hasNft]) => hasNft)
      .map(([userId]) => userId);

    const now = new Date().toISOString();

    const updatePromises = [];

    if (usersToRevoke.length > 0) {
      updatePromises.push(
        supabase
          .from('profiles')
          .update({ has_premium_nft: false, nft_verified_at: now })
          .in('id', usersToRevoke)
      );
    }

    if (usersToGrant.length > 0) {
      updatePromises.push(
        supabase
          .from('profiles')
          .update({ has_premium_nft: true, nft_verified_at: now })
          .in('id', usersToGrant)
      );
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // 7. Mark batch as confirmed
    const processedIds = newActivities.map((a) => a.eventId);
    await supabase
      .from('chain_tx_log')
      .update({ status: 'confirmed' })
      .in('id', processedIds);

    return {
      processed: newActivities.length,
      skipped: activities.length - newActivities.length,
    };
  } catch (error) {
    console.error('Error in batch processing:', error);

    // Mark failed events
    const failedIds = newActivities.map((a) => a.eventId);
    await supabase
      .from('chain_tx_log')
      .update({
        status: 'failed',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
      .in('id', failedIds);

    throw error;
  }
}

/**
 * Main request handler
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed', message: 'Only POST requests are allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const demoMode = Deno.env.get('DEMO_MODE')?.toLowerCase() === 'true';
    if (demoMode) {
      return new Response(
        JSON.stringify({ demo: true, ignored: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const signingKey = Deno.env.get('ALCHEMY_WEBHOOK_SIGNING_KEY');
    const membershipNFTAddress = Deno.env.get('MEMBERSHIP_NFT_ADDRESS');

    if (!signingKey || !membershipNFTAddress) {
      console.error('CRITICAL: Missing configuration (fail-closed)');
      return new Response(
        JSON.stringify({ error: 'configuration_error', message: 'Webhook verification unavailable' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const signature = req.headers.get('x-alchemy-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: 'Missing signature header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Distributed rate limiting — keyed by Alchemy signature (no authenticated user)
    const rl = await checkRateLimit(signature ?? 'anonymous', RATE_LIMIT_CONFIGS.alchemyWebhook);
    if (!rl.allowed) {
      return rateLimitExceededResponse(null, rl);
    }

    const rawBody = await req.text();
    const isValidSignature = await verifyAlchemySignature(rawBody, signature, signingKey);

    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: 'Invalid webhook signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let payload: AlchemyWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: 'invalid_payload', message: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (payload.type !== 'NFT_ACTIVITY') {
      return new Response(
        JSON.stringify({ success: true, processed: 0, skipped: 1, reason: 'unsupported_type' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const activities = payload.event.activity || [];
    const result = await processNFTTransfersBatch(supabase, activities, membershipNFTAddress);

    return new Response(
      JSON.stringify({
        success: true,
        webhook_id: payload.webhookId,
        processed: result.processed,
        skipped: result.skipped,
        total: activities.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in alchemy-webhook function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_error',
        message: 'An unexpected error occurred',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
