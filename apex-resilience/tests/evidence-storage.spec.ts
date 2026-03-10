// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fsp from 'node:fs/promises';
import {
  getSecureEvidenceDir,
  createSecureEvidenceDir,
  writeSecureEvidence,
  generateEvidenceHash,
  cleanupEvidenceDir,
} from '../core/evidence-storage';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    mkdirSync: vi.fn(),
    mkdtempSync: vi.fn((prefix: string) => prefix + 'mock-123'),
  };
});

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
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

  describe('getSecureEvidenceDir', () => {
    it('throws if APEX_EVIDENCE_STORAGE is public temp dir', () => {
      process.env.APEX_EVIDENCE_STORAGE = os.tmpdir();
      expect(() => getSecureEvidenceDir()).toThrow(/publicly writable/);
    });

    it('returns configured secure path', () => {
      const p = path.join(os.homedir(), 'custom_secure');
      process.env.APEX_EVIDENCE_STORAGE = p;
      expect(getSecureEvidenceDir()).toBe(p);
    });

    it('returns project-local dir', () => {
      delete process.env.APEX_EVIDENCE_STORAGE;
      const r = getSecureEvidenceDir();
      expect(r).toContain('.apex');
    });
  });

  describe('createSecureEvidenceDir', () => {
    it('creates with 0700 permissions', async () => {
      await createSecureEvidenceDir('/test/dir');
      expect(fsp.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true, mode: 0o700 });
    });
  });

  describe('writeSecureEvidence', () => {
    it('rejects path traversal', async () => {
      await expect(writeSecureEvidence('invalid..id', 'x')).rejects.toThrow(/path traversal/);
      await expect(writeSecureEvidence('', 'x')).rejects.toThrow(/non-empty/);
    });

    it('writes securely', async () => {
      const p = path.join(os.homedir(), 'safe_test_dir');
      process.env.APEX_EVIDENCE_STORAGE = p;
      const fp = await writeSecureEvidence('valid-task-1', '{}');
      expect(fp).toBe(path.join(p, 'valid-task-1.json'));
      expect(fsp.writeFile).toHaveBeenCalled();
    });
  });

  describe('generateEvidenceHash', () => {
    it('produces consistent sha256', () => {
      const h1 = generateEvidenceHash('test');
      const h2 = generateEvidenceHash('test');
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });
  });

  describe('cleanupEvidenceDir', () => {
    it('runs without error', async () => {
      delete process.env.APEX_EVIDENCE_STORAGE;
      await cleanupEvidenceDir();
    });
  });
});
