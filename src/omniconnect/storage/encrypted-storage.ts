/**
 * Encrypted Token Storage
 * Secure storage for provider tokens with AES-GCM encryption.
 *
 * Uses the Web Crypto API (available in all modern browsers and
 * Deno/Node 18+ without imports) instead of node:crypto to ensure
 * compatibility across browser, Capacitor, and edge environments.
 */

import { SessionToken } from '../types/connector';

// Constants for AES-256-GCM
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const KEY_ENV_VAR = 'OMNICONNECT_ENCRYPTION_KEY';

export interface StoredSession extends SessionToken {
  createdAt: Date;
  lastSyncAt?: Date;
  encryptedToken: string;
  encryptionKeyId: string;
}

function getKeyHex(): string {
  const keyHex =
    (typeof process !== 'undefined' && process.env?.[KEY_ENV_VAR]) ||
    (import.meta as unknown as Record<string, Record<string, string>>)?.env?.[KEY_ENV_VAR];
  if (!keyHex) {
    throw new Error(`CRITICAL: Missing ${KEY_ENV_VAR}. Storage cannot operate.`);
  }
  if (keyHex.length !== 64) {
    throw new Error(`CRITICAL: ${KEY_ENV_VAR} must be a 32-byte hex string (64 hex characters).`);
  }
  return keyHex;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function importKey(): Promise<CryptoKey> {
  const keyBytes = hexToBytes(getKeyHex());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return crypto.subtle.importKey('raw', keyBytes as any, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);

  // Web Crypto appends the 16-byte auth tag at the end of the cipher buffer
  const cipherBytes = new Uint8Array(cipherBuffer);
  const ciphertext = cipherBytes.slice(0, cipherBytes.length - 16);
  const authTag = cipherBytes.slice(cipherBytes.length - 16);

  // Format: IV:AuthTag:Ciphertext (all hex)
  return `${bytesToHex(iv)}:${bytesToHex(authTag)}:${bytesToHex(ciphertext)}`;
}

async function decryptToken(packedBlob: string): Promise<string> {
  const parts = packedBlob.split(':');
  if (parts.length !== 3) {
    throw new Error('Data corruption: Invalid encrypted token format');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = await importKey();
  const iv = hexToBytes(ivHex);
  const authTag = hexToBytes(authTagHex);
  const ciphertext = hexToBytes(ciphertextHex);

  // Web Crypto expects ciphertext + authTag concatenated
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decryptedBuffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv: iv as any }, key, combined as any);
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Encrypted storage for OAuth tokens using Web Crypto API.
 * Compatible with browser, Capacitor (iOS/Android), and Deno edge environments.
 */
export class EncryptedTokenStorage {
  private getSupabaseConfig() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase configuration');
    return { url, key };
  }

  async store(sessionToken: SessionToken): Promise<void> {
    const encryptedTokenValue = await encryptToken(sessionToken.token);
    const { url, key } = this.getSupabaseConfig();

    const storedSession = {
      tenant_id: 'default', // In a real multi-tenant app, extract from context
      connector_id: sessionToken.connectorId,
      provider: sessionToken.provider,
      user_id: sessionToken.userId,
      token: encryptedTokenValue,
      encryption_key_id: 'env-var',
      scopes: sessionToken.scopes || [],
      created_at: new Date().toISOString(),
    };

    const res = await fetch(`${url}/rest/v1/connector_sessions?on_conflict=tenant_id,connector_id`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([storedSession]),
    });

    if (!res.ok) throw new Error(`Failed to store session: ${res.status}`);
  }

  async get(connectorId: string): Promise<StoredSession | null> {
    const { url, key } = this.getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/connector_sessions?connector_id=eq.${encodeURIComponent(connectorId)}&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });

    if (!res.ok) return null;
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!data || data.length === 0) return null;

    const session = data[0];
    try {
      const decryptedTokenValue = await decryptToken(session.token);
      return {
        connectorId: session.connector_id,
        provider: session.provider,
        userId: session.user_id,
        token: decryptedTokenValue,
        scopes: session.scopes,
        createdAt: new Date(session.created_at),
        lastSyncAt: session.last_sync_at ? new Date(session.last_sync_at) : undefined,
        encryptedToken: session.token,
        encryptionKeyId: session.encryption_key_id
      };
    } catch (error) {
      console.error(`Security Alert: Failed to decrypt session for ${connectorId}`, error);
      return null;
    }
  }

  async delete(connectorId: string): Promise<void> {
    const { url, key } = this.getSupabaseConfig();
    await fetch(`${url}/rest/v1/connector_sessions?connector_id=eq.${encodeURIComponent(connectorId)}`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
  }

  async listActive(userId: string): Promise<StoredSession[]> {
    const { url, key } = this.getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/connector_sessions?user_id=eq.${encodeURIComponent(userId)}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) return [];
    return this.decryptSessions(await res.json() as Array<Record<string, unknown>>);
  }

  async listByProvider(userId: string, provider: string): Promise<StoredSession[]> {
    const { url, key } = this.getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/connector_sessions?user_id=eq.${encodeURIComponent(userId)}&provider=eq.${encodeURIComponent(provider)}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) return [];
    return this.decryptSessions(await res.json() as Array<Record<string, unknown>>);
  }

  async getLastSync(connectorId: string): Promise<Date> {
    const session = await this.get(connectorId);
    return session?.lastSyncAt ?? new Date(0);
  }

  async updateLastSync(connectorId: string, lastSyncAt: Date): Promise<void> {
    const { url, key } = this.getSupabaseConfig();
    await fetch(`${url}/rest/v1/connector_sessions?connector_id=eq.${encodeURIComponent(connectorId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ last_sync_at: lastSyncAt.toISOString() }),
    });
  }

  private async decryptSessions(rawSessions: Array<Record<string, unknown>>): Promise<StoredSession[]> {
    const results = await Promise.allSettled(
      rawSessions.map(async (session) => {
        const decryptedTokenValue = await decryptToken(session.token);
        return {
          connectorId: session.connector_id,
          provider: session.provider,
          userId: session.user_id,
          token: decryptedTokenValue,
          scopes: session.scopes,
          createdAt: new Date(session.created_at),
          lastSyncAt: session.last_sync_at ? new Date(session.last_sync_at) : undefined,
          encryptedToken: session.token,
          encryptionKeyId: session.encryption_key_id
        };
      }),
    );
    return results
      .map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        console.error(`Security Alert: Failed to decrypt session for ${rawSessions[i].connector_id}`, r.reason);
        return null;
      })
      .filter((s): s is StoredSession => s !== null);
  }
}
