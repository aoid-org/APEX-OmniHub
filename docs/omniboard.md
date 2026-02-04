# OmniBoard: Connect-Only Onboarding Engine

## Definition

OmniBoard is a deterministic, connect-only onboarding engine that outputs a verified Connection Spec and stops, performing no workflow logic, schema mapping, or automation.

## NON-NEGOTIABLE SCOPE

- **Connect-Only**: Connects apps only.
- **No Orchestration**: MUST NOT ask about triggers, actions, workflows, or automation.
- **Output**: Verified Connection Spec.
- **Zero Drift**: Workflow logic remains in OmniLink/OmniHub; execution in OmniPort.

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

## "OmniBoard Does NOT Do..."

- It does **NOT** configure workflows.
- It does **NOT** ask "what do you want to do with this app?".
- It does **NOT** map data fields.
- It does **NOT** run triggers.
- It does **NOT** store plain-text secrets (Vault only).
