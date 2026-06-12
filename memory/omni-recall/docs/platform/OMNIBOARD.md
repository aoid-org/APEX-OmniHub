---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v8.1 | LAST_UPDATED=2026-06-10 -->
# OmniBoard: Dual-Surface Onboarding & Integration System

## Definition

OmniBoard is a dual-surface system. It is both a direct user-interaction
surface and a backend application integration layer. The two surfaces share
the OmniBoard name but have distinct contracts, and documentation must not
collapse one into the other.

**Surface 1 — Client-facing endpoint (Left Sidebar Widget → OmniBoard modal).**
OmniBoard is the first widget in the locked OmniDash left-sidebar rail
(`apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`, id
`omniboard`, `moduleKey: null`). Selecting it focuses the persistent
OmniBoard canvas — the main dashboard surface over which all other module
modals open (`OmniDashShell.tsx` `handleNav`). The conversational OmniBoard
modal (`apps/omnihub-site/dashboard/components/OmniBoardWizard.tsx`) opens
via OmniSpatialHost (`useOmniModal.getState().invoke`, e.g. from LinksModule
with `contextData.moduleKey: 'omniboard-wizard'`). In the modal the user
interacts by typing prompts that drive the FSM turn-by-turn; voice capture
on the dashboard surface is provided by the `RecordButton` component. This
is a direct user-interaction surface, not an integration pipeline.

**Surface 2 — Application integration layer.** The backend pipeline where
external application JSON payloads are normalized into unified APEX-OmniHub
state vectors for application integration and onboarding. The connect stage
is the deterministic FSM engine (orchestrator endpoints `/omniboard/start`
and `/omniboard/{session_id}/next`) that outputs a verified Connection Spec.
Downstream payload normalization (schema mapping, type coercion,
deterministic `omni_id` generation) is performed by the Universal Sync
Orchestrator and related skills — see
`.claude/skills/apex-universal-sync-orchestrator/`.

> **Scoping correction (2026-06-10):** an earlier constraint stated
> "OmniBoard is strictly for application integration and onboarding — not
> for clients." That was too broad as a platform-wide rule and is retired.
> The accurate scoping: skills targeting the integration pipeline scope
> themselves to application integration and state that they do not handle
> client interactions; OmniBoard as a product is dual-surface.

**Connect AI (BYOM) Integration:** In addition to standard 3rd-party apps,
OmniBoard powers the "Connect AI" (internally BYOM - Bring Your Own Model)
onboarding flow. By using this engine, Connect AI treats the user's provider
API key simultaneously as their authentication token into APEX, the
encryption key seed for their vault entry, and the runtime credential
powering every inference inside their workspace. APEX is the orchestration
layer only — zero compute spend on model calls for BYOM users.

## CONNECT-ENGINE SCOPE (Non-Negotiable)

The connect-stage FSM engine (the flow driven through the OmniBoard modal)
is deterministic and connect-only:

- **Connect-Only**: Connects 3rd-party apps (Claude, MS Word, etc.) and AI Models (Connect AI / BYOM) only.
- **Provider Keys as Identity**: Connect AI (BYOM) operates using the provider key as the workspace identity and login credential.
- **No Orchestration**: MUST NOT ask about triggers, actions, workflows, or automation.
- **Output**: Verified Connection Spec.
- **Zero Drift**: Workflow logic remains in OmniLink/OmniHub; execution in OmniPort. Payload normalization belongs to the integration-layer pipeline (Universal Sync Orchestrator), never to the connect wizard.

## FSM States (Deterministic)

The FSM allows only these states. One concept per state. One decision per user turn.

1.  **IDLE_LISTEN**: Waiting for user intent to connect an app.
2.  **APP_IDENTIFICATION**: Resolving the provider name (fuzzy match + confirmation).
3.  **AUTH_SETUP**: collecting credentials via OAuth, API Key, or Device Code.
4.  **AUTH_COMPLETE**: Credentials received, ready to verify.
5.  **VERIFY_CONNECTION**: Performing least-privilege ping (profile/introspection).
6.  **REGISTER_CONNECTION**: Persisting to OmniPort registry and Vault.
7.  **COMPLETION**: Returning the Spec and ending the session.
8.  **RECOVERY_RETRY**: Handling failures with non-blaming prompts.

## Connection Spec (Schema)

The output MUST match this JSON contract exactly.

```json
{
  "omniboard_version": "1.0",
  "tenant_id": "...",
  "connection": {
    "connection_id": "conn_<uuid>",
    "provider_name": "...",
    "provider_hint": "...",
    "match_confidence": 0.xx,
    "auth_type": "oauth|api_key|device_code|basic",
    "token_ref": "vault://...",
    "verified": true,
    "verification_method": "provider_profile|token_introspection|safe_ping",
    "connected_at": "..."
  },
  "security": {
    "guardian_profile": "default",
    "triforce_tier": "standard|high",
    "risk_flags": []
  },
  "audit": {
    "trace_id": "...",
    "created_at": "..."
  }
}
```

## Integration-Layer Pipeline (Payload Normalization)

After a connection is established, external application payloads enter the
integration layer for normalization before any state is onboarded:

- **Engine**: `apex-universal-sync-orchestrator` skill
  (`.claude/skills/apex-universal-sync-orchestrator/scripts/sync_payload.py`).
- **Envelope contract**: payloads must carry `source_system`,
  `sync_timestamp`, and `data_payload`.
- **Mapping**: schema-driven field mapping with type coercion (`string`,
  `integer`, `float`, `boolean`) and schema defaults for optional fields.
- **Deduplication**: deterministic `omni_id` =
  `{source_system}_{digits of sync_timestamp}` — re-syncs of the same
  payload produce the same identifier.
- **Reporting**: all mapping violations are collected and reported in a
  single pass (one `FIELD_NAME: reason` line per violation, exit 1);
  successful runs emit the normalized state vector JSON on exit 0.

## "The Connect Wizard Does NOT Do..."

- It does **NOT** configure workflows.
- It does **NOT** ask "what do you want to do with this app?".
- It does **NOT** map data fields — schema mapping and normalization happen
  in the integration-layer pipeline (Universal Sync Orchestrator), after the
  Connection Spec is produced.
- It does **NOT** run triggers.
- It does **NOT** store plain-text secrets (Vault only).
