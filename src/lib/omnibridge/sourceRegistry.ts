/**
 * Source Registry for OmniBridge Webhook Ingestion
 *
 * Parses and validates the OMNIBRIDGE_M2M_CLIENTS environment variable
 * to establish a registry of known machine sources and their webhook keys.
 *
 * @module lib/omnibridge/sourceRegistry
 * @license Proprietary - APEX Business Systems Ltd.
 */

export interface WebhookConfig {
  source_id: string;
  key_id: string;
  secret_env: string;
  status: 'active' | 'inactive';
  allowed_ips?: string[];
}

export interface M2MClientRecord {
  client_id: string;
  client_secret_hash: string;
  scopes: string[];
  tenant_id: string;
  webhook?: WebhookConfig;
}

/**
 * Validates a single M2M client record at runtime.
 */
function isValidClientRecord(record: unknown): record is M2MClientRecord { // NOSONAR
  if (!record || typeof record !== 'object') return false;

  const rec = record as Record<string, unknown>;
  if (typeof rec.client_id !== 'string') return false;
  if (typeof rec.client_secret_hash !== 'string') return false;

  if (!Array.isArray(rec.scopes)) return false;
  for (const s of rec.scopes) {
    if (typeof s !== 'string') return false;
  }

  if (typeof rec.tenant_id !== 'string') return false;

  if (rec.webhook !== undefined) {
    const w = rec.webhook;
    if (!w || typeof w !== 'object') return false;

    const wObj = w as Record<string, unknown>;
    if (typeof wObj.source_id !== 'string') return false;
    if (typeof wObj.key_id !== 'string') return false;
    if (typeof wObj.secret_env !== 'string') return false;
    if (wObj.status !== 'active' && wObj.status !== 'inactive') return false;

    if (wObj.allowed_ips !== undefined) {
      if (!Array.isArray(wObj.allowed_ips)) return false;
      for (const ip of wObj.allowed_ips) {
        if (typeof ip !== 'string') return false;
      }
    }
  }

  return true;
}

let cachedClients: M2MClientRecord[] | null = null;
let lastParseError: Error | null = null;

/**
 * Parses and validates the OMNIBRIDGE_M2M_CLIENTS environment variable.
 * Fails closed on malformed config.
 */
export function getM2MClients(): M2MClientRecord[] | null {
  if (cachedClients) return cachedClients;

  const clientsJson = process.env['OMNIBRIDGE_M2M_CLIENTS'];
  if (!clientsJson) {
    lastParseError = new Error('OMNIBRIDGE_M2M_CLIENTS is not configured');
    return null;
  }

  try {
    const parsed = JSON.parse(clientsJson) as unknown;
    if (!Array.isArray(parsed)) {
      lastParseError = new Error('OMNIBRIDGE_M2M_CLIENTS must be a JSON array');
      return null;
    }

    const validClients: M2MClientRecord[] = [];
    for (const item of parsed) {
      if (!isValidClientRecord(item)) {
        lastParseError = new Error(`Malformed client record: ${JSON.stringify(item)}`);
        return null; // Fail closed if any record is invalid
      }
      validClients.push(item);
    }

    cachedClients = validClients;
    return validClients;
  } catch (e) {
    lastParseError = new Error(`Failed to parse OMNIBRIDGE_M2M_CLIENTS: ${e instanceof Error ? e.message : String(e)}`);
    return null; // Fail closed on JSON parse error
  }
}

/**
 * Returns any initialization/parsing error for diagnostic logging.
 */
export function getRegistryError(): Error | null {
  return lastParseError;
}

export interface WebhookSourceResolution {
  client: M2MClientRecord;
  webhook: WebhookConfig;
  secret: string;
}

/**
 * Looks up an active webhook source by source_id and key_id.
 * Resolves the secret via the configured secret_env.
 */
export function resolveWebhookSource(sourceId: string, keyId: string): WebhookSourceResolution | null {
  const clients = getM2MClients();
  if (!clients || clients.length === 0) return null;

  for (const client of clients) {
    if (client.webhook && client.webhook.source_id === sourceId && client.webhook.key_id === keyId) { // NOSONAR
      if (client.webhook.status !== 'active') return null;

      const secret = process.env[client.webhook.secret_env];
      if (!secret) {
        console.error(`[omnibridge/sourceRegistry] Secret env var ${client.webhook.secret_env} not configured for source ${sourceId}`);
        return null; // Fail closed if secret is missing
      }

      return {
        client,
        webhook: client.webhook,
        secret
      };
    }
  }

  return null;
}

/**
 * Test utility to clear the cached clients and errors.
 */
export function clearRegistryCache(): void {
  cachedClients = null;
  lastParseError = null;
}
