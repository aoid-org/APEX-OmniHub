/**
 * OmniConnect Connector Interface
 * Universal interface for all data provider integrations
 */

import { CanonicalEvent } from './canonical';

export interface SessionToken {
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  connectorId: string;
  userId: string;
  tenantId: string;
  provider: string;
  scopes: string[];
}

export interface ConnectorConfig {
  provider: string;
  clientId: string;
  clientSecret?: string; // Only for server-side flows
  redirectUri: string;
  scopes: string[];
  baseUrl: string;
}

export interface RawEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface NormalizationContext {
  userId: string;
  tenantId: string;
  correlationId: string;
  origin?: string;
}

/**
 * Universal Connector Interface
 * All provider integrations must implement this interface
 */
export interface Connector {
  readonly provider: string;

  /**
   * Initialize OAuth2/PKCE handshake for user
   * Returns authorization URL for frontend redirect
   */
  getAuthUrl(userId: string, tenantId: string, state: string): Promise<string>;

  /**
   * Complete OAuth2 handshake with authorization code
   * Exchanges code for tokens and stores encrypted session
   */
  completeHandshake(
    userId: string,
    tenantId: string,
    code: string,
    codeVerifier: string,
    state: string
  ): Promise<SessionToken>;

  /**
   * Disconnect provider for user
   * Revokes tokens and cleans up stored data
   */
  disconnect(connectorId: string): Promise<void>;

  /**
   * Refresh expired session token
   * Takes the current session (which contains the old token) and returns a new session
   */
  refreshToken(session: SessionToken): Promise<SessionToken>;

  /**
   * Fetch new data since last sync
   * Returns raw provider events
   */
  fetchDelta(session: SessionToken, since: Date): Promise<RawEvent[]>;

  /**
   * Normalize raw provider events to canonical schema
   * This is the key translation step
   */
  normalizeToCanonical(
    rawEvents: RawEvent[],
    context?: NormalizationContext
  ): Promise<CanonicalEvent[]>;

  /**
   * Validate provider token is still active
   */
  validateToken(session: SessionToken): Promise<boolean>;
}

/**
 * Connector Registry
 * Manages available connectors by provider name
 */
export interface ConnectorRegistry {
  register(provider: string, connector: Connector): void;
  get(provider: string): Connector | undefined;
  list(): string[];
  has(provider: string): boolean;
}
