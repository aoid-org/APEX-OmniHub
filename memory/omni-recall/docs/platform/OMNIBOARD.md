---
version: 1.1.0
last_audited: 2026-06-20
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v8.2 | LAST_UPDATED=2026-06-20 -->
# OmniBoard: App Integration System

## OmniBoard

OmniBoard is the user-facing UI endpoint for third-party app integration.

Selecting OmniBoard from the OmniDash sidebar opens the OmniBoard app-integration surface/modal. That surface contains the app-integration agent, including voice-agent interaction, which asks the user what app/service/provider they want to connect and guides the user through the deterministic connection flow.

OmniBoard owns third-party app integration onboarding, Connect AI/BYOM onboarding where applicable, provider/app identification, credential setup, verification, and verified Connection Spec generation.

OmniBoard must not be launched from Links.

## Links

Links is an independent link/context widget.

Links lets users add, type, paste, save, select, and manage links/URLs that they want to use as context. Links can hand selected URL context to OmniSlate or the agent context pipeline if a real existing path is wired.

Links is not the third-party app integration surface. Links must not open OmniBoard, `omniboard`, or `omniboard-wizard`.

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
- **Envelope contract**: payloads must carry `source_system`, `sync_timestamp`, and `data_payload`.
- **Mapping**: schema-driven field mapping with type coercion (`string`, `integer`, `float`, `boolean`) and schema defaults for optional fields.
- **Deduplication**: deterministic `omni_id` = `{source_system}_{digits of sync_timestamp}`.
- **Reporting**: all mapping violations are collected and reported in a single pass.

## "The Connect Wizard Does NOT Do..."

- It does **NOT** configure workflows.
- It does **NOT** ask "what do you want to do with this app?".
- It does **NOT** map data fields.
- It does **NOT** run triggers.
- It does **NOT** store plain-text secrets (Vault only).
