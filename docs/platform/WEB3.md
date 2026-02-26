# Web3 Identity & NFT Verification

<!-- APEX_DOC_STAMP
Owner: DevSecOps
Status: Active
Last Updated: 2026-02-25
Applies to Version: 1.4.0
-->

## Overview

APEX OmniHub supports optional Web3-native identity via:

- **SIWE (Sign-In with Ethereum)** — `supabase/functions/web3-verify/`
- **NFT ownership verification** — `supabase/functions/verify-nft/`
- **Multi-chain support** — Ethereum mainnet (chainId 1) and Polygon mainnet (chainId 137)

## NFT Verification Architecture

### Decision: Option A (Real Verification via Alchemy NFT API)

**Chosen approach:** Real on-chain NFT ownership verification using the Alchemy NFT API v3.

| Decision | Option A — Real Verification |
|----------|------------------------------|
| **API** | Alchemy NFT API v3 (`getNFTsForOwner`, `getOwnersForNFT`) |
| **Auth** | JWT Bearer token required on every request |
| **Input validation** | Ethereum address regex (`0x` + 40 hex chars) |
| **Timeout** | 10 seconds — fail-closed on timeout |
| **Missing config** | Returns `501 verification_not_implemented` with `hasNFT: false` |

### Required Secrets

| Secret | Purpose | Where to Set |
|--------|---------|-------------|
| `ALCHEMY_API_KEY_ETH` | Alchemy API key for Ethereum mainnet | Supabase Edge Function secrets |
| `ALCHEMY_API_KEY_POLYGON` | Alchemy API key for Polygon mainnet | Supabase Edge Function secrets |
| `NFT_CONTRACT_ADDRESS` | Default NFT contract address (optional) | Supabase Edge Function secrets |

### DEMO_MODE Fallback (Option B)

When Alchemy API keys are **not configured**, the function supports a controlled demo mode:

- **Activates only when:** `DEMO_MODE=true` **AND** `SUPABASE_ENV=sandbox` (both required)
- **Returns:** `hasNFT: true` with `_demo: true` flag
- **Purpose:** Local development and sandbox testing only

### Hard Guard (Fail-Closed)

```
if (!DEMO_MODE && !alchemyKey) → HTTP 501 { hasNFT: false, error: "verification_not_implemented" }
```

**Invariant:** Production NEVER returns `hasNFT: true` without a completed, verifiable on-chain lookup.

### STOP Condition (STOP-2)

If real verification secrets are unavailable in the target environment:
- Option B (fail-closed stub) is active unconditionally
- The function returns `501` with `hasNFT: false`
- Required secrets are documented above — configure them to enable real verification

## API Reference

### `POST /verify-nft`

**Request:**
```json
{
  "walletAddress": "0x...",
  "chainId": 1,
  "contractAddress": "0x...",
  "tokenId": "1"
}
```

**Success Response (200):**
```json
{
  "hasNFT": true,
  "walletAddress": "0x...",
  "chainId": 1,
  "contractAddress": "0x...",
  "verifiedAt": "2026-02-25T00:00:00.000Z"
}
```

**Fail-Closed Response (501):**
```json
{
  "hasNFT": false,
  "error": "verification_not_implemented",
  "message": "NFT verification requires ALCHEMY_API_KEY_ETH to be configured"
}
```

## Testing

```bash
# Run Deno unit tests
deno test --allow-env supabase/functions/verify-nft/index.test.ts
```

Tests verify:
- Address validation (regex)
- Chain configuration mapping
- Alchemy URL construction
- Ownership check logic (case-insensitive)
- **HARD GUARD:** prod mode NEVER returns `hasNFT: true` without on-chain lookup
- **DEMO_MODE:** requires both `DEMO_MODE=true` AND `SUPABASE_ENV=sandbox`
