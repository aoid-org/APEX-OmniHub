# NFT Verification — Ops Runbook

**Last Updated:** 2026-02-20  
**Owned by:** OmniLink APEX Ops  
**Related functions:** `verify-nft`, `alchemy-webhook`

---

## Overview

APEX OmniHub uses on-chain NFT ownership to gate premium features.  
Two edge functions participate in the NFT pipeline:

| Function | Trigger | Purpose |
|---|---|---|
| `verify-nft` | User-initiated POST | Real-time ownership check via Alchemy NFT API |
| `alchemy-webhook` | Alchemy push event | Async ownership sync on NFT transfer |

---

## Required Environment Variables

Set via `supabase secrets set` or the Supabase dashboard under **Edge Functions > Secrets**.

| Variable | Required by | Description | Where to get it |
|---|---|---|---|
| `ALCHEMY_API_KEY_ETH` | `verify-nft` | Alchemy API key for Ethereum mainnet (chain ID 1) | [Alchemy Dashboard](https://dashboard.alchemy.com/) — create an Ethereum app |
| `ALCHEMY_API_KEY_POLYGON` | `verify-nft` | Alchemy API key for Polygon mainnet (chain ID 137) | Alchemy Dashboard — create a Polygon app |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | `alchemy-webhook` | HMAC-SHA256 signing key to verify Alchemy webhook payloads | Alchemy Dashboard → Webhooks → Your webhook → Signing Key |
| `MEMBERSHIP_NFT_ADDRESS` | `alchemy-webhook` | ERC-721 contract address for the premium membership NFT | Deployed contract address (0x...) |

### Setting secrets

```bash
supabase secrets set ALCHEMY_API_KEY_ETH=<your-eth-key>
supabase secrets set ALCHEMY_API_KEY_POLYGON=<your-polygon-key>
supabase secrets set ALCHEMY_WEBHOOK_SIGNING_KEY=<your-signing-key>
supabase secrets set MEMBERSHIP_NFT_ADDRESS=0x<your-contract-address>
```

---

## Fail-Closed Behavior

Both functions are hardened to **fail-closed** — they deny access rather than grant it on any error condition:

| Condition | `verify-nft` response | `alchemy-webhook` response |
|---|---|---|
| Missing `ALCHEMY_API_KEY_{ETH\|POLYGON}` | `503 Service Unavailable` | — |
| Missing `ALCHEMY_WEBHOOK_SIGNING_KEY` | — | `500 Internal Server Error` (triggers Alchemy retry) |
| Missing `MEMBERSHIP_NFT_ADDRESS` | — | `500 Internal Server Error` (triggers Alchemy retry) |
| Invalid Alchemy signature | — | `401 Unauthorized` |
| Alchemy API returns non-200 | Returns `hasNFT: false` | Marks event as failed in `chain_tx_log` |
| Alchemy API times out (>10s) | Returns `hasNFT: false` | — |
| Unauthenticated request | `401 Unauthorized` | — (webhook uses signature, not JWT) |

> **Note:** `alchemy-webhook` returns HTTP 500 on configuration errors so that Alchemy retries delivery and on-call engineers receive alerts. It returns HTTP 200 only on successfully processed or intentionally skipped events.

---

## Deploying

```bash
# Deploy verify-nft
supabase functions deploy verify-nft --no-verify-jwt

# Deploy alchemy-webhook (no JWT — authenticated via X-Alchemy-Signature header)
supabase functions deploy alchemy-webhook --no-verify-jwt
```

> `verify-nft` requires JWT (`--no-verify-jwt` is NOT used). The function validates the JWT internally via `authenticateUser()`.

---

## Alchemy Webhook Setup

1. Log into [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Navigate to **Webhooks → Create Webhook**
3. Select **NFT Activity** as the webhook type
4. Set the webhook URL to:  
   `https://<your-supabase-project>.supabase.co/functions/v1/alchemy-webhook`
5. Add the NFT contract address to watch under **Contract Addresses**
6. Copy the **Signing Key** and set it as `ALCHEMY_WEBHOOK_SIGNING_KEY`
7. Redeploy the function to pick up the new secret

---

## Supported Chains

| Chain ID | Network | Alchemy Slug | Env Var |
|---|---|---|---|
| 1 | Ethereum Mainnet | `eth-mainnet` | `ALCHEMY_API_KEY_ETH` |
| 137 | Polygon Mainnet | `polygon-mainnet` | `ALCHEMY_API_KEY_POLYGON` |

To add additional chains (Arbitrum, Optimism, Base), extend `CHAIN_CONFIG` in `verify-nft/index.ts` and add the corresponding env var.

---

## Monitoring & Alerting

### Key metrics to watch

| Signal | Table / Log | Healthy threshold |
|---|---|---|
| NFT transfer events processed | `chain_tx_log` — `status = 'confirmed'` | Events confirmed within 60s of Alchemy delivery |
| NFT transfer events failed | `chain_tx_log` — `status = 'failed'` | 0 per hour (any failure warrants investigation) |
| Webhook signature failures | Edge function logs — `Invalid webhook signature` | 0 per day |
| verify-nft 503 errors | Edge function logs — `CONFIGURATION_ERROR` | 0 (indicates missing env var) |
| Alchemy API timeouts | Edge function logs — `timed out after 10000ms` | < 1% of requests |

### Querying chain_tx_log

```sql
-- Recent failed NFT events
SELECT id, tx_hash, metadata, created_at
FROM chain_tx_log
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Events stuck in 'pending' for > 5 minutes
SELECT id, tx_hash, created_at
FROM chain_tx_log
WHERE status = 'pending'
  AND created_at < now() - interval '5 minutes';
```

---

## Runbook: verify-nft returns 503

**Symptom:** Users get "NFT verification service is not configured" error.

**Cause:** `ALCHEMY_API_KEY_ETH` or `ALCHEMY_API_KEY_POLYGON` is missing or blank.

**Steps:**
1. Check Supabase Edge Function secrets:
   ```bash
   supabase secrets list
   ```
2. If missing, set the key:
   ```bash
   supabase secrets set ALCHEMY_API_KEY_ETH=<key>
   ```
3. Redeploy the function:
   ```bash
   supabase functions deploy verify-nft
   ```
4. Verify recovery by calling the endpoint with a valid JWT and wallet address.

---

## Runbook: alchemy-webhook returning 500 on every call

**Symptom:** Alchemy retries deliveries, escalating alerts from Alchemy dashboard.

**Cause:** `ALCHEMY_WEBHOOK_SIGNING_KEY` or `MEMBERSHIP_NFT_ADDRESS` is missing.

**Steps:**
1. Check secrets: `supabase secrets list`
2. Set missing secret(s):
   ```bash
   supabase secrets set ALCHEMY_WEBHOOK_SIGNING_KEY=<key>
   supabase secrets set MEMBERSHIP_NFT_ADDRESS=0x<address>
   ```
3. Redeploy: `supabase functions deploy alchemy-webhook --no-verify-jwt`
4. Verify in Alchemy dashboard that the next delivery succeeds (200 or 2xx).

---

## Runbook: NFT transfer not reflected in user profile

**Symptom:** User transferred/received an NFT but `has_premium_nft` was not updated.

**Steps:**
1. Check `chain_tx_log` for the transaction hash:
   ```sql
   SELECT * FROM chain_tx_log WHERE tx_hash = '0x<txhash>';
   ```
2. If status is `failed`, inspect `metadata.error` for the failure reason.
3. If the row doesn't exist, the webhook was never delivered — check Alchemy dashboard for delivery failures.
4. If status is `pending` and > 5 minutes old, the processing step errored silently — check edge function logs.
5. Manual remediation (run as service_role):
   ```sql
   UPDATE profiles
   SET has_premium_nft = true, nft_verified_at = now()
   WHERE id = '<user_id>';

   UPDATE chain_tx_log SET status = 'confirmed' WHERE tx_hash = '0x<txhash>';
   ```

---

## API Contract

### POST /verify-nft

**Headers:** `Authorization: Bearer <supabase-jwt>`

**Request:**
```json
{
  "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "chainId": 1,
  "contractAddress": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
  "tokenId": "42"
}
```

**Success response:**
```json
{
  "hasNFT": true,
  "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "chainId": 1,
  "contractAddress": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
  "verifiedAt": "2026-02-20T18:00:00.000Z"
}
```

**Error responses:**

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 400 | `INVALID_WALLET` | walletAddress is not a valid Ethereum address |
| 400 | `INVALID_CONTRACT` | contractAddress is not a valid Ethereum address |
| 400 | `UNSUPPORTED_CHAIN` | chainId is not supported |
| 503 | `CONFIGURATION_ERROR` | Alchemy API key not configured (ops alert) |
| 500 | `VERIFICATION_ERROR` | Unexpected internal error |
