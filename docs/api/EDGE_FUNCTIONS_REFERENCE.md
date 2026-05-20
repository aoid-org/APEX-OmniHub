<!-- APEX_DOC_STAMP: VERSION=v1.6.0 | LAST_UPDATED=2026-05-20 -->
# APEX OmniHub — Edge Functions API Reference

**Base URL:** `https://rtopreovkywofgwgmozi.supabase.co/functions/v1/`
**Auth:** All endpoints require `Authorization: Bearer <token>` unless noted.

## Quick Reference

31 Edge Functions deployed as of 2026-05-20.

| Function | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `apex-assistant` | POST | Yes (anon) | AI conversation handler |
| `apex-voice` | POST | Yes (anon) | Real-time voice processing |
| `byom-cockpit` | POST | Yes (anon) | Bring-Your-Own-Model cockpit interface |
| `byom-proxy` | POST | Yes (anon) | Bring-Your-Own-Model proxy relay |
| `mcp-proxy` | POST | Yes (anon) | MCP protocol proxy |
| `omnilink-agent` | POST | Yes (anon or service) | Submit agent goal for orchestration |
| `omnilink-eval` | POST | Yes (service only) | Run evaluation suite |
| `omnilink-port` | POST | Yes (anon) | Universal connector input normalization |
| `omnilink-retry-scheduler` | POST | Yes (service) | Retry scheduler for failed omnilink tasks |
| `trigger-workflow` | POST | Yes (service) | Dispatch Temporal workflow |
| `execute-automation` | POST | Yes (service) | Direct workflow execution |
| `omni-runs` | POST | Yes (anon or service) | Run tracking and management |
| `test-integration` | POST | Yes (service) | Integration smoke testing |
| `omnibridge-control` | POST | Yes (service) | OmniBridge command and control |
| `generate-business-skills` | POST | Yes (anon) | AI-powered business skill generation |
| `activate-client` | POST | Yes (service) | Client onboarding activation |
| `platform-health` | GET | No | Platform health check |
| `ops-voice-health` | GET | No | Voice subsystem health check |
| `alchemy-webhook` | POST | No (HMAC-signed) | Alchemy blockchain event webhook |
| `verify-nft` | POST | Yes (anon) | NFT ownership verification |
| `web3-nonce` | GET | No | Generate SIWE nonce |
| `web3-verify` | POST | No | SIWE wallet authentication |
| `create-checkout` | POST | Yes (anon) | Stripe checkout session creation |
| `stripe-webhook` | POST | No (HMAC-signed) | Stripe payment event webhook |
| `send-push-notification` | POST | Yes (service) | Mobile push delivery |
| `storage-upload-url` | POST | Yes (anon) | Generate signed storage upload URL |
| `_shared` | — | — | Shared utilities directory (not a callable endpoint) |

---

## Webhook Functions

### POST /stripe-webhook

Receives and validates Stripe payment events. Auth is HMAC-signed (no Bearer token).

#### Required Secrets

Both secrets must be set as Supabase function secrets before the function will handle any requests. If either is absent, the function returns **HTTP 503 "Webhook handler misconfigured"** immediately — no Stripe event processing occurs.

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Stripe API client authentication |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |

Set via:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref rtopreovkywofgwgmozi
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref rtopreovkywofgwgmozi
```

**Implementation note (updated 2026-05-20):** The Stripe client is instantiated inside the request handler, after secret validation, not at module level. Previous behavior used `?? ''` fallbacks that silently allowed the function to start with empty secrets and fail at runtime during Stripe API calls — this is now fixed. Missing secrets cause an early exit before any Stripe SDK call.

---

### Shared Utility: `_shared/requestSigning.ts`

The `requestSigning` module signs and verifies HMAC-authenticated requests between internal services (e.g., `omnibridge-control` ↔ orchestrator).

**Required secret:** `ORCHESTRATOR_SHARED_SECRET` must be set as a Supabase function secret. If absent, the module throws `Error('ORCHESTRATOR_SHARED_SECRET is required')` — previously it fell back to an empty-string HMAC, which produced structurally valid but cryptographically worthless signatures. That fallback has been removed.

```bash
supabase secrets set ORCHESTRATOR_SHARED_SECRET=<min-256-bit-value> --project-ref rtopreovkywofgwgmozi
```

---

## Core Endpoints

### POST /omnilink-agent

Submit a natural language goal for the Tri-Force orchestration pipeline.

**Request:**
```json
{
  "goal": "string — natural language instruction (required)",
  "context": "object — optional key-value context",
  "session_id": "string — optional conversation thread ID",
  "man_mode": "boolean — require Manual Approval Node approval for RED lane (default: true)"
}
```

**Response:**
```json
{
  "workflow_id": "string",
  "status": "queued | executing | complete | man_pending | failed",
  "result": "object | null",
  "man_task_id": "string | null — present when MAN approval required"
}
```

**Error codes:**

| Code | Meaning |
|------|---------|
| 400  | Invalid goal or missing required field |
| 401  | Missing or invalid auth token |
| 403  | Guardian blocked — goal violates policy |
| 429  | Embedding budget exceeded for tenant |
| 503  | Temporal worker unavailable |

---

### GET /platform-health

No auth required. Returns platform operational status.

**Response:**
```json
{
  "status": "ok | degraded | down",
  "timestamp": "ISO 8601",
  "version": "semver",
  "components": {
    "database": "ok | degraded | down",
    "orchestrator": "ok | degraded | down",
    "cache": "ok | degraded | down"
  }
}
```

---

## Authentication

All endpoints except `web3-verify` and `platform-health` require authentication.

**Anon key** (for user-facing calls, subject to RLS):
```bash
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     https://rtopreovkywofgwgmozi.supabase.co/functions/v1/omnilink-agent \
     -d '{"goal": "List my recent tasks"}'
```

**Service role key** (server-to-server only, bypasses RLS — never use client-side):
```bash
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     https://rtopreovkywofgwgmozi.supabase.co/functions/v1/trigger-workflow \
     -d '{"workflow_type": "agent", "input": {}}'
```

---

## Rate Limits

| Tier | Requests/min | Embedding tokens/month |
|------|-------------|----------------------|
| Free | 10 | 50,000 |
| Starter | 60 | 500,000 |
| Pro | 300 | 5,000,000 |
| Enterprise | Custom | Custom |

---

*Full OpenAPI spec coming in v1.5.0. Track at: https://github.com/apexbusiness-systems/APEX-OmniHub/issues*
