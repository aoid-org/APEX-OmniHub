import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EncryptedTokenStorage, StoredSession } from '@/omniconnect/storage/encrypted-storage';
import { SessionToken } from '@/omniconnect/types/connector';
import { randomBytes } from 'node:crypto';

describe('EncryptedTokenStorage', () => {
  const TEST_KEY = randomBytes(32).toString('hex');
  const INVALID_KEY_SHORT = randomBytes(16).toString('hex');

  let storage: EncryptedTokenStorage;

  const sampleToken: SessionToken = {
    token: 'my-super-secret-token',
    expiresAt: new Date(Date.now() + 3600000),
    connectorId: 'connector-123',
    userId: 'user-456',
    tenantId: 'tenant-789',
    provider: 'test-provider',
    scopes: ['read', 'write']
  };

  beforeEach(() => {
    process.env.OMNICONNECT_ENCRYPTION_KEY = TEST_KEY;
    storage = new EncryptedTokenStorage();
  });

  afterEach(() => {
    delete process.env.OMNICONNECT_ENCRYPTION_KEY;
    vi.restoreAllMocks();
  });

  it('should throw if encryption key is missing', async () => {
    delete process.env.OMNICONNECT_ENCRYPTION_KEY;
    const s = new EncryptedTokenStorage();
    await expect(s.store(sampleToken)).rejects.toThrow('CRITICAL: Missing OMNICONNECT_ENCRYPTION_KEY');
  });

  it('should throw if encryption key is invalid length', async () => {
    process.env.OMNICONNECT_ENCRYPTION_KEY = INVALID_KEY_SHORT;
    const s = new EncryptedTokenStorage();
    await expect(s.store(sampleToken)).rejects.toThrow('32-byte hex string');
  });

  it('should encrypt token on store and decrypt on get', async () => {
    await storage.store(sampleToken);

    // Verify storage has encrypted data by accessing private map (casting to unknown then StoredSession map)
    const internalStorage = (storage as unknown as { storage: Map<string, StoredSession> }).storage;
    const stored = internalStorage.get(sampleToken.connectorId);

    expect(stored).toBeDefined();
    expect(stored?.token).not.toBe(sampleToken.token);
    expect(stored?.token).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // IV:Tag:Cipher format

    // Verify retrieval returns plaintext
    const retrieved = await storage.get(sampleToken.connectorId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.token).toBe(sampleToken.token);
    expect(retrieved?.connectorId).toBe(sampleToken.connectorId);
  });

  it('should handle listActive with decryption', async () => {
    await storage.store(sampleToken);
    const anotherToken = { ...sampleToken, connectorId: 'connector-456', token: 'another-secret' };
    await storage.store(anotherToken);

    const active = await storage.listActive(sampleToken.userId);
    expect(active).toHaveLength(2);
    expect(active.find(s => s.connectorId === 'connector-123')?.token).toBe('my-super-secret-token');
    expect(active.find(s => s.connectorId === 'connector-456')?.token).toBe('another-secret');
  });

  it('should handle listByProvider with decryption', async () => {
    await storage.store(sampleToken);

    const sessions = await storage.listByProvider(sampleToken.userId, sampleToken.provider);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].token).toBe(sampleToken.token);
  });

  it('should return null (and log error) if decryption fails', async () => {
    await storage.store(sampleToken);

    // Tamper with the stored data
    const internalStorage = (storage as unknown as { storage: Map<string, StoredSession> }).storage;
    const stored = internalStorage.get(sampleToken.connectorId);

    if (stored) {
      // Modify ciphertext part of the blob
      const parts = stored.token.split(':');
      parts[2] = 'deadbeef'; // Corrupt ciphertext
      stored.token = parts.join(':');
    }

    // Spy on console.error to verify logging
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const retrieved = await storage.get(sampleToken.connectorId);
    expect(retrieved).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Security Alert'), expect.anything());
  });

  it('should fail if key changes internally (simulating key rotation mismatch)', async () => {
    await storage.store(sampleToken);

    // Change key in environment
    process.env.OMNICONNECT_ENCRYPTION_KEY = randomBytes(32).toString('hex');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const retrieved = await storage.get(sampleToken.connectorId);
    expect(retrieved).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle delete, getLastSync, and updateLastSync', async () => {
    await storage.store(sampleToken);

    // Test getLastSync default
    expect(await storage.getLastSync('non-existent')).toEqual(new Date(0));

    // Test getLastSync existing
    await storage.get(sampleToken.connectorId);
    // storage.store sets createdAt, but lastSyncAt is undefined initially
    expect(await storage.getLastSync(sampleToken.connectorId)).toEqual(new Date(0));

    // Test updateLastSync
    const now = new Date();
    await storage.updateLastSync(sampleToken.connectorId, now);
    expect(await storage.getLastSync(sampleToken.connectorId)).toEqual(now);

    // Test delete
    await storage.delete(sampleToken.connectorId);
    expect(await storage.get(sampleToken.connectorId)).toBeNull();
  });
});
