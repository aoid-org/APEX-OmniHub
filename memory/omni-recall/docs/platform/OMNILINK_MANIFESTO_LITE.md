---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v1.4.2 | LAST_UPDATED=2026-05-20 -->
# OMNiLiNK MANIFESTO (LITE)

## 1. Purpose

OMNiLiNK is the **integration bus** for the APEX ecosystem.  
This app has a **single, optional OMNiLiNK port** so it can publish/consume events without being hard‑coupled.

This document explains **why** the port exists and **how** to use it safely.

## 2. Principles

1. **Optional by default**  
   The app must run correctly with OMNiLiNK off or unreachable.

2. **Single integration port**  
   All OMNiLiNK logic lives behind one adapter/client module instead of being scattered.

3. **No secrets in code**  
   All keys/URLs live in env/config, never in the repo.

4. **Observable**  
   There is a healthcheck (endpoint or CLI) to see if OMNiLiNK is disabled/ok/error.

5. **Reversible**  
   Turning OMNiLiNK off is as simple as flipping an env flag and redeploying.

## 3. This App’s OMNiLiNK Port

_Fill per app when you drop this file in._

- **APP_NAME:** APEX OmniHub
- **Primary role:** Universal Sync Orchestrator for governed execution across AI, enterprise, and Web3 stacks
- **OMNiLiNK role:**
  - Publishes: orchestration events, policy verdicts, audit logs
  - Consumes: connector status, global settings, entitlement updates

- **Port location:** `src/omniconnect/omnilink-port.ts`
- **Main entry:** `omnilink-port.ts`  
- **Key methods:** `isEnabled()`, `sendEvent(...)`, `syncOnce()` (if used)

## 4. How to Enable OMNiLiNK (For Admins)

1. **Get OMNiLiNK details** from your APEX / OMNiLiNK account.  
2. **Set env vars** (names may vary per app):
   - `OMNILINK_ENABLED=true`
   - `OMNILINK_BASE_URL=...`
   - `OMNILINK_TENANT_ID=...`
   - Any extra keys documented in `docs/OMNILINK_ENABLEMENT_GUIDE.md`.

3. **Deploy / restart** the app.  
4. **Run the healthcheck**:
   - CLI: `bun run omnilink:health`
   - or HTTP: `https://your-app.com/health/omnilink`

5. Confirm the healthcheck reports OMNiLiNK as **enabled/ok**.

If something is wrong, set `OMNILINK_ENABLED=false`, redeploy, and the app will behave as before.

## 5. Safety & Rollback

- When OMNiLiNK is **disabled**, the port should no‑op and not affect core features.  
- When **enabled but misconfigured**, the app should still boot; only the healthcheck and logs should show errors.  
- To fully disable OMNiLiNK:
  1. Set `OMNILINK_ENABLED=false` (or remove OMNiLiNK env vars).  
  2. Redeploy / restart.  
  3. Confirm healthcheck reports “disabled (OK)”.

## 6. Engineer Reference

- **Adapter module:** `src/omniconnect/omnilink-port.ts`
- **Types:** `src/omniconnect/types/connector.ts`
- **Tests:** `tests/omnilink-port.test.ts`, `tests/omnilink-scopes.test.ts`, `tests/omniconnect/omnilink-delivery.test.ts`
- **Healthcheck:** `bun run omnilink:health`  

Keep this section in sync when you update the OMNiLiNK port.
