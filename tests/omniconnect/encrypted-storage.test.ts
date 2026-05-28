import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EncryptedTokenStorage } from '@/omniconnect/storage/encrypted-storage';
import { SessionToken } from '@/omniconnect/types/connector';
import { randomBytes } from 'node:crypto';

describe('EncryptedTokenStorage', () => {
  const _TEST_KEY = randomBytes(32).toString('hex');
  const INVALID_KEY_SHORT = randomBytes(16).toString('hex');

  let storage: EncryptedTokenStorage;
  let mockDb: any[] = [];

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
    vi.stubEnv('SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key'.padStart(64, 'a'));
    
    // We also need to mock the OMNICONNECT_ENCRYPTION_KEY since we're using webcrypto
    const TEST_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    vi.stubEnv('OMNICONNECT_ENCRYPTION_KEY', TEST_KEY_HEX);
    
    mockDb = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(options.body);
        for (const item of body) {
          const idx = mockDb.findIndex(i => i.connector_id === item.connector_id);
          if (idx >= 0) mockDb[idx] = { ...mockDb[idx], ...item };
          else mockDb.push(item);
        }
        return { ok: true };
      }
      if (options?.method === 'DELETE') {
        mockDb = mockDb.filter(i => !url.includes(`connector_id=eq.${encodeURIComponent(i.connector_id)}`));
        return { ok: true };
      }
      if (options?.method === 'PATCH') {
        const body = JSON.parse(options.body);
        mockDb = mockDb.map(i => url.includes(`connector_id=eq.${encodeURIComponent(i.connector_id)}`) ? { ...i, ...body } : i);
        return { ok: true };
      }
      
      let res = mockDb;
      if (url.includes('connector_id=eq.')) {
        const id = decodeURIComponent(url.match(/connector_id=eq\.([^&]+)/)?.[1] || '');
        res = mockDb.filter(i => i.connector_id === id);
      }
      if (url.includes('user_id=eq.')) {
        const id = decodeURIComponent(url.match(/user_id=eq\.([^&]+)/)?.[1] || '');
        res = res.filter(i => i.user_id === id);
      }
      if (url.includes('provider=eq.')) {
        const p = decodeURIComponent(url.match(/provider=eq\.([^&]+)/)?.[1] || '');
        res = res.filter(i => i.provider === p);
      }
      return { ok: true, json: async () => res };
    });

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

    const stored = mockDb.find(i => i.connector_id === sampleToken.connectorId);
    expect(stored).toBeDefined();
    expect(stored?.token).not.toBe(sampleToken.token);
    expect(stored?.token).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

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

    const stored = mockDb.find(i => i.connector_id === sampleToken.connectorId);
    if (stored) {
      const parts = stored.token.split(':');
      parts[2] = 'deadbeef';
      stored.token = parts.join(':');
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const retrieved = await storage.get(sampleToken.connectorId);
    expect(retrieved).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Security Alert'), expect.anything());
  });

  it('should fail if key changes internally (simulating key rotation mismatch)', async () => {
    await storage.store(sampleToken);

    process.env.OMNICONNECT_ENCRYPTION_KEY = randomBytes(32).toString('hex');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const retrieved = await storage.get(sampleToken.connectorId);
    expect(retrieved).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle delete, getLastSync, and updateLastSync', async () => {
    await storage.store(sampleToken);

    expect(await storage.getLastSync('non-existent')).toEqual(new Date(0));

    await storage.get(sampleToken.connectorId);
    expect(await storage.getLastSync(sampleToken.connectorId)).toEqual(new Date(0));

    const now = new Date();
    await storage.updateLastSync(sampleToken.connectorId, now);
    expect(await storage.getLastSync(sampleToken.connectorId)).toEqual(now);

    await storage.delete(sampleToken.connectorId);
    expect(await storage.get(sampleToken.connectorId)).toBeNull();
  });
});
