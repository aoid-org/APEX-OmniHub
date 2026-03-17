/**
 * Encrypted Token Storage
 * Secure storage for provider tokens with AES-GCM encryption
 */

import { SessionToken } from '../types/connector';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Constants for AES-256-GCM
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const KEY_ENV_VAR = 'OMNICONNECT_ENCRYPTION_KEY';

export interface StoredSession extends SessionToken {
  createdAt: Date;
  lastSyncAt?: Date;
  encryptedToken: string;
  encryptionKeyId: string;
}

/**
 * Encrypted storage for OAuth tokens
 * Implementation uses AES-256-GCM with a strict 32-byte key from environment.
 */
export class EncryptedTokenStorage {
  private storage = new Map<string, StoredSession>();

  async store(sessionToken: SessionToken): Promise<void> {
    const encryptedToken = this.encryptToken(sessionToken.token);

    const storedSession: StoredSession = {
      ...sessionToken,
      token: encryptedToken, // Overwrite with packed blob
      createdAt: new Date(),
      encryptedToken: encryptedToken, // Duplicate for interface compliance
      encryptionKeyId: 'env-var'
    };

    this.storage.set(sessionToken.connectorId, storedSession);
  }

  async get(connectorId: string): Promise<StoredSession | null> {
    const session = this.storage.get(connectorId);
    if (!session) return null;

    try {
      const decryptedToken = this.decryptToken(session.token);
      return {
        ...session,
        token: decryptedToken // Return plaintext to consumer
      };
    } catch (error) {
      // Handle decryption failure (e.g., key rotation issues or tampering)
      console.error(`Security Alert: Failed to decrypt session for ${connectorId}`, error);
      return null;
    }
  }

  async delete(connectorId: string): Promise<void> {
    this.storage.delete(connectorId);
  }

  async listActive(userId: string): Promise<StoredSession[]> {
    const sessions = Array.from(this.storage.values()).filter(
      session => session.userId === userId
    );

    return this.decryptSessions(sessions);
  }

  async listByProvider(userId: string, provider: string): Promise<StoredSession[]> {
    const sessions = Array.from(this.storage.values()).filter(
      session => session.userId === userId && session.provider === provider
    );

    return this.decryptSessions(sessions);
  }

  async getLastSync(connectorId: string): Promise<Date> {
    const session = this.storage.get(connectorId);
    return session?.lastSyncAt || new Date(0); // Return epoch if no sync yet
  }

  async updateLastSync(connectorId: string, lastSyncAt: Date): Promise<void> {
    const session = this.storage.get(connectorId);
    if (session) {
      session.lastSyncAt = lastSyncAt;
    }
  }

  private decryptSessions(sessions: StoredSession[]): StoredSession[] {
    return sessions.map(session => {
      try {
        const decryptedToken = this.decryptToken(session.token);
        return {
          ...session,
          token: decryptedToken
        };
      } catch (error) {
        console.error(`Security Alert: Failed to decrypt session for ${session.connectorId}`, error);
        return null;
      }
    }).filter((s): s is StoredSession => s !== null);
  }

  private getKey(): Buffer {
    const keyHex = process.env[KEY_ENV_VAR];
    if (!keyHex) {
      throw new Error(`CRITICAL: Missing ${KEY_ENV_VAR}. Storage cannot operate.`);
    }
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      throw new Error(`CRITICAL: ${KEY_ENV_VAR} must be a 32-byte hex string.`);
    }
    return key;
  }

  private encryptToken(plaintext: string): string {
    const key = this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: IV:AuthTag:Ciphertext
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decryptToken(packedBlob: string): string {
    const key = this.getKey();
    const parts = packedBlob.split(':');

    if (parts.length !== 3) {
      throw new Error('Data corruption: Invalid encrypted token format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
