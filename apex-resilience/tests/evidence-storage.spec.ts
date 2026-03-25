// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  resolveEvidenceBackend,
  createSecureEvidenceDir,
  writeSecureEvidence,
  generateEvidenceHash,
  cleanupEvidenceDir
} from '../core/evidence-storage';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    mkdirSync: vi.fn(),
    mkdtempSync: vi.fn().mockImplementation((prefix) => prefix + 'mock-123')
  };
});

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined)
}));

describe('Evidence Storage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolveEvidenceBackend', () => {
    it('throws if APEX_EVIDENCE_STORAGE is set to public temp dir', () => {
      process.env.APEX_EVIDENCE_STORAGE = os.tmpdir();
      expect(() => resolveEvidenceBackend()).toThrow(/publicly writable directory/);
    });

    it('returns APEX_EVIDENCE_STORAGE if configured', () => {
      // Pick a secure path that is different from os.tmpdir
      const securePath = path.join(os.homedir(), 'custom_secure_apex_path');
      process.env.APEX_EVIDENCE_STORAGE = securePath;
      const config = resolveEvidenceBackend();
      expect(config.backend).toBe('local');
      expect(config.localPath).toBe(securePath);
    });

    it('returns project local dir', () => {
      delete process.env.APEX_EVIDENCE_STORAGE;
      const config = resolveEvidenceBackend();
      expect(config.backend).toBe('local');
      expect(config.localPath).toContain('.apex');
      expect(config.localPath).toContain('evidence');
    });
  });

  describe('createSecureEvidenceDir', () => {
    it('creates directory with restrictive permissions', async () => {
      await createSecureEvidenceDir('/test/path');
      expect(fsp.mkdir).toHaveBeenCalledWith('/test/path', { recursive: true, mode: 0o700 });
      expect(fsp.stat).toHaveBeenCalledWith('/test/path');
    });
  });

  describe('writeSecureEvidence', () => {
    it('validates task ID', async () => {
      await expect(writeSecureEvidence('invalid..id', 'data')).rejects.toThrow(/path traversal/);
      await expect(writeSecureEvidence('inv@lid', 'data')).rejects.toThrow(/invalid characters/);
      await expect(writeSecureEvidence('', 'data')).rejects.toThrow(/non-empty/);
    });

    it('securely writes evidence', async () => {
      const securePath = path.join(os.homedir(), 'custom_secure_test_path');
      process.env.APEX_EVIDENCE_STORAGE = securePath;
      
      const filepath = await writeSecureEvidence('valid-task-123', '{"data": true}');
      
      expect(filepath).toBe(path.join(securePath, 'valid-task-123.json'));
      expect(fsp.writeFile).toHaveBeenCalledWith(
        filepath,
        '{"data": true}',
        { mode: 0o600, flag: 'w', encoding: 'utf-8' }
      );
    });
  });

  describe('generateEvidenceHash', () => {
    it('generates consistent sha256 hashes', () => {
      const hash1 = generateEvidenceHash('test-content');
      const hash2 = generateEvidenceHash('test-content');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // sha256 hex length
    });
  });

  describe('cleanupEvidenceDir', () => {
    it('executes cleanup properly', async () => {
      delete process.env.APEX_EVIDENCE_STORAGE;
      // Triggers cleanup
      await cleanupEvidenceDir();
      // It won't call rm because the cached path from prior tests was a local path (not pid-based temp) 
      // but it should not throw.
    });
  });
});
