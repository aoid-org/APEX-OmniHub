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
  private storage = new Map<string, StoredSession>();

  async store(sessionToken: SessionToken): Promise<void> {
    const encryptedTokenValue = await encryptToken(sessionToken.token);

    const storedSession: StoredSession = {
      ...sessionToken,
      token: encryptedTokenValue,
      createdAt: new Date(),
      encryptedToken: encryptedTokenValue,
      encryptionKeyId: 'env-var',
    };

    this.storage.set(sessionToken.connectorId, storedSession);
  }

  async get(connectorId: string): Promise<StoredSession | null> {
    const session = this.storage.get(connectorId);
    if (!session) return null;

    try {
      const decryptedTokenValue = await decryptToken(session.token);
      return { ...session, token: decryptedTokenValue };
    } catch (error) {
      console.error(`Security Alert: Failed to decrypt session for ${connectorId}`, error);
      return null;
    }
  }

  async delete(connectorId: string): Promise<void> {
    this.storage.delete(connectorId);
  }

  async listActive(userId: string): Promise<StoredSession[]> {
    const sessions = Array.from(this.storage.values()).filter(
      (session) => session.userId === userId,
    );
    return this.decryptSessions(sessions);
  }

  async listByProvider(userId: string, provider: string): Promise<StoredSession[]> {
    const sessions = Array.from(this.storage.values()).filter(
      (session) => session.userId === userId && session.provider === provider,
    );
    return this.decryptSessions(sessions);
  }

  async getLastSync(connectorId: string): Promise<Date> {
    const session = this.storage.get(connectorId);
    return session?.lastSyncAt ?? new Date(0);
  }

  async updateLastSync(connectorId: string, lastSyncAt: Date): Promise<void> {
    const session = this.storage.get(connectorId);
    if (session) {
      session.lastSyncAt = lastSyncAt;
    }
  }

  private async decryptSessions(sessions: StoredSession[]): Promise<StoredSession[]> {
    const results = await Promise.allSettled(
      sessions.map(async (session) => {
        const decryptedTokenValue = await decryptToken(session.token);
        return { ...session, token: decryptedTokenValue };
      }),
    );
    return results
      .map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        console.error(
          `Security Alert: Failed to decrypt session for ${sessions[i].connectorId}`,
          r.reason,
        );
        return null;
      })
      .filter((s): s is StoredSession => s !== null);
  }
}
