<!-- APEX_DOC_STAMP: VERSION=v1.4.2 | LAST_UPDATED=2026-03-15 -->
# APEX OmniHub — Edge Functions API Reference

**Base URL:** `https://[SUPABASE_PROJECT_REF].supabase.co/functions/v1/`
**Auth:** All endpoints require `Authorization: Bearer <token>` unless noted.

## Quick Reference

| Function | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `omnilink-agent` | POST | Yes (anon or service) | Submit agent goal for orchestration |
| `omnilink-eval` | POST | Yes (service only) | Run evaluation suite |
| `omnilink-port` | POST | Yes (anon) | Universal connector input normalization |
| `trigger-workflow` | POST | Yes (service) | Dispatch Temporal workflow |
| `apex-assistant` | POST | Yes (anon) | AI conversation handler |
| `apex-voice` | POST | Yes (anon) | Real-time voice processing |
| `web3-verify` | POST | No | SIWE wallet authentication |
| `verify-nft` | POST | Yes (anon) | NFT ownership verification |
| `send-push-notification` | POST | Yes (service) | Mobile push delivery |
| `platform-health` | GET | No | Platform health check |
| `execute-automation` | POST | Yes (service) | Direct workflow execution |

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
     https://[REF].supabase.co/functions/v1/omnilink-agent \
     -d '{"goal": "List my recent tasks"}'
```

**Service role key** (server-to-server only, bypasses RLS — never use client-side):
```bash
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     https://[REF].supabase.co/functions/v1/trigger-workflow \
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
