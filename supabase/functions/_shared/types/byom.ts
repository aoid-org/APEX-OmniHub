/**
 * ============================================================
 * BYOM Type Definitions
 * ============================================================
 *
 * Project:    APEX OmniHub — Project COCKPIT (BYOM Architecture)
 * Module:     byom-types
 * Version:    1.0.0
 * Date:       2026-02-17
 * Author:     APEX Business Systems Engineering
 * License:    Proprietary — APEX Business Systems
 * Reference:  byom 3.md §2B — Session Binding Architecture
 *
 * Mirrors SQL schema in:
 * - provider_connections (Credential Vault)
 * - pilot_sessions (Ephemeral Runtime Binding)
 *
 * SECURITY NOTE:
 * ProviderConnectionSafe is the ONLY type safe for client exposure.
 * ProviderConnection.credential_ciphertext is INTERNAL ONLY.
 */

// ──────────────────────────────────────────────────────────
// Enum Types (mirror SQL enums)
// ──────────────────────────────────────────────────────────

/** Approved LLM providers (Chinese-origin explicitly excluded) */
export type ByomProvider = "openai" | "google" | "anthropic" | "xai";

/** Authentication method used for provider connection */
export type ByomAuthType =
  | "api_key"
  | "oauth_refresh"
  | "oauth_access"
  | "service_account"
  | "ephemeral";

/** Connection lifecycle status */
export type ByomStatus = "active" | "revoked" | "expired" | "rotated";

/** Data sovereignty enforcement mode */
export type ByomSovereigntyMode =
  | "standard"
  | "byom_sovereign"
  | "strict_region";

// ──────────────────────────────────────────────────────────
// Database Row Types
// ──────────────────────────────────────────────────────────

/**
 * Full provider_connections row (INTERNAL USE ONLY).
 *
 * WARNING: credential_ciphertext MUST NEVER be exposed to
 * frontend, client code, API responses, logs, or audit trails.
 */
export interface ProviderConnection {
  connection_id: string;
  tenant_id: string;
  user_id: string;
  provider: ByomProvider;
  auth_type: ByomAuthType;

  /** @internal AES-256-GCM encrypted credential. NEVER expose to client. */
  credential_ciphertext?: Uint8Array;

  /** SHA-256 hex hash (64 chars). Safe to log. */
  credential_fingerprint: string;

  /** Provider-specific OAuth scopes or API permissions */
  scopes_or_permissions: Record<string, unknown>;

  status: ByomStatus;

  /** Last 4-6 chars of credential for UI display */
  key_hint: string;

  created_at: string;
  updated_at: string;
  last_used_at?: string;

  /** OAuth token expiry (null for static API keys) */
  token_expires_at?: string;

  /** Incremented on each key rotation */
  rotation_version: number;
}

/**
 * Sanitized provider_connections view (SAFE FOR CLIENT).
 * Maps to user_provider_connections_safe SQL view.
 * Excludes: credential_ciphertext, credential_fingerprint, user_id, tenant_id
 */
export interface ProviderConnectionSafe {
  connection_id: string;
  provider: ByomProvider;
  auth_type: ByomAuthType;
  status: ByomStatus;
  key_hint: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  token_expires_at?: string;
  rotation_version: number;
}

/**
 * Pilot session (ephemeral runtime binding).
 * Created when an agent run binds to a user's BYOM credential.
 */
export interface PilotSession {
  pilot_session_id: string;
  connection_id: string;
  trace_id: string; // Maps to agent_runs.id
  user_id: string;
  tenant_id: string;
  model: string;
  sovereignty_mode: ByomSovereigntyMode;

  /** SHA-256 of OmniPolicy JSON at session mint time (immutable audit) */
  policy_snapshot_hash: string;

  issued_at: string;
  expires_at: string;
  revoked_at?: string;
}

// ──────────────────────────────────────────────────────────
// API Request / Response Types
// ──────────────────────────────────────────────────────────

/** POST /byom/key/connect — Request body */
export interface ConnectRequest {
  provider: ByomProvider;
  auth_type: ByomAuthType;
  api_key: string;
}

/** POST /byom/key/connect — Success response */
export interface ConnectResponse {
  status: "connected";
  connection: {
    connection_id: string;
    provider: ByomProvider;
    key_hint: string;
    created_at: string;
  };
}

/** POST /byom/key/rotate — Request body */
export interface RotateRequest {
  connection_id: string;
  new_api_key: string;
}

/** POST /byom/key/rotate — Success response */
export interface RotateResponse {
  status: "rotated";
  connection_id: string;
  key_hint: string;
  rotation_version: number;
}

/** GET /byom/connections — Success response */
export interface ListConnectionsResponse {
  connections: ProviderConnectionSafe[];
}

/** POST /byom/key/revoke — Request body */
export interface RevokeRequest {
  connection_id: string;
}

/** POST /byom/key/revoke — Success response */
export interface RevokeResponse {
  status: "revoked";
  connection_id: string;
}

/** Standard error response */
export interface ByomErrorResponse {
  error: string;
  details?: string;
  existing_connection_id?: string;
}

// ──────────────────────────────────────────────────────────
// Audit Types
// ──────────────────────────────────────────────────────────

/** BYOM audit action types (convention: 'byom.*' prefix) */
export type ByomAuditAction =
  | "byom.connect"
  | "byom.disconnect"
  | "byom.rotate"
  | "byom.session_mint"
  | "byom.credential_access";

/** Audit log metadata (NO SECRETS — enforced by DB constraint) */
export interface ByomAuditMetadata {
  provider?: ByomProvider;
  fingerprint?: string; // SHA-256 hash, safe to log
  auth_type?: ByomAuthType;
  rotation_version?: number;
  new_fingerprint?: string;
  status?: string;
  model?: string;
  session_id?: string;
}
