// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  resolveEvidenceBackend,
  getSecureEvidenceDir,
  createSecureEvidenceDir,
  writeSecureEvidence,
  generateEvidenceHash,
  cleanupEvidenceDir,
} from '../../apex-resilience/core/evidence-storage';

/**
 * Coverage tests for apex-resilience/core/evidence-storage.ts
 *
 * Specifically targets the NOSONAR-annotated tmp directory check
 * and all backend resolution paths.
 */

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    mkdirSync: vi.fn(),
  };
});

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}));

describe('evidence-storage coverage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolveEvidenceBackend', () => {
    it('returns s3 backend for s3:// URI', () => {
      process.env.APEX_EVIDENCE_STORAGE = 's3://my-bucket/prefix';
      const config = resolveEvidenceBackend();
      expect(config.backend).toBe('s3');
      expect(config.s3Bucket).toBe('my-bucket');
      expect(config.s3Prefix).toBe('prefix');
    });

    it('returns s3 backend without prefix', () => {
      process.env.APEX_EVIDENCE_STORAGE = 's3://my-bucket';
      const config = resolveEvidenceBackend();
      expect(config.backend).toBe('s3');
      expect(config.s3Bucket).toBe('my-bucket');
      expect(config.s3Prefix).toBe('');
    });

    it('throws for s3:// URI without bucket name', () => {
      process.env.APEX_EVIDENCE_STORAGE = 's3://';
      expect(() => resolveEvidenceBackend()).toThrow('missing a bucket name');
    });

    it('throws for /tmp directory (NOSONAR line)', () => {
      process.env.APEX_EVIDENCE_STORAGE = '/tmp';
      expect(() => resolveEvidenceBackend()).toThrow('publicly writable directory');
    });

    it('throws for /tmp subdirectory', () => {
      process.env.APEX_EVIDENCE_STORAGE = '/tmp/my-evidence';
      expect(() => resolveEvidenceBackend()).toThrow('publicly writable directory');
    });

    it('throws for os.tmpdir()', () => {
      process.env.APEX_EVIDENCE_STORAGE = os.tmpdir();
      expect(() => resolveEvidenceBackend()).toThrow('publicly writable directory');
    });

    it('throws for os.tmpdir() subdirectory', () => {
      process.env.APEX_EVIDENCE_STORAGE = os.tmpdir() + path.sep + 'sub';
      expect(() => resolveEvidenceBackend()).toThrow('publicly writable directory');
    });

    it('warns when running inside Kubernetes container', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.APEX_EVIDENCE_STORAGE = '/var/data/evidence';
      process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1';
      const config = resolveEvidenceBackend();
      expect(config.backend).toBe('local');
      expect(config.localPath).toBe('/var/data/evidence');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('container or PaaS dyno'),
      );
      warnSpy.mockRestore();
      delete process.env.KUBERNETES_SERVICE_HOST;
    });

    it('warns when running on Heroku dyno', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.APEX_EVIDENCE_STORAGE = '/var/data/evidence';
      process.env.DYNO = 'web.1';
      resolveEvidenceBackend();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
      delete process.env.DYNO;
    });

    it('warns when running on Fly.io', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.APEX_EVIDENCE_STORAGE = '/var/data/evidence';
      process.env.FLY_APP_NAME = 'apex-prod';
      resolveEvidenceBackend();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
      delete process.env.FLY_APP_NAME;
    });

    it('returns explicit local path', () => {
      const securePath = path.join(os.homedir(), 'apex-evidence');
      process.env.APEX_EVIDENCE_STORAGE = securePath;
      const config = resolveEvidenceBackend();
      expect(config.backend).toBe('local');
      expect(config.localPath).toBe(securePath);
    });

    it('returns default dev/CI path when unset', () => {
      delete process.env.APEX_EVIDENCE_STORAGE;
      const config = resolveEvidenceBackend();
      expect(config.backend).toBe('local');
      expect(config.localPath).toContain('.apex');
      expect(config.localPath).toContain('evidence');
    });

    it('uses APEX_PROJECT_ROOT when set', () => {
      delete process.env.APEX_EVIDENCE_STORAGE;
      process.env.APEX_PROJECT_ROOT = '/custom/project';
      const config = resolveEvidenceBackend();
      expect(config.localPath).toBe(path.join('/custom/project', '.apex', 'evidence'));
      delete process.env.APEX_PROJECT_ROOT;
    });

    it('strips trailing slash from s3 prefix', () => {
      process.env.APEX_EVIDENCE_STORAGE = 's3://bucket/prefix/';
      const config = resolveEvidenceBackend();
      expect(config.s3Prefix).toBe('prefix');
    });
  });

  describe('getSecureEvidenceDir', () => {
    it('throws when S3 backend is configured', () => {
      process.env.APEX_EVIDENCE_STORAGE = 's3://my-bucket';
      expect(() => getSecureEvidenceDir()).toThrow('not applicable');
    });
  });

  describe('writeSecureEvidence', () => {
    it('rejects task ID with path traversal characters', async () => {
      await expect(writeSecureEvidence('../etc/passwd', 'data')).rejects.toThrow(
        'path traversal',
      );
    });

    it('rejects task ID with forward slash', async () => {
      await expect(writeSecureEvidence('a/b', 'data')).rejects.toThrow(
        'path traversal',
      );
    });

    it('rejects task ID with backslash', async () => {
      await expect(writeSecureEvidence('a\\b', 'data')).rejects.toThrow(
        'path traversal',
      );
    });

    it('rejects empty task ID', async () => {
      await expect(writeSecureEvidence('', 'data')).rejects.toThrow('non-empty');
    });

    it('rejects task ID with special characters', async () => {
      await expect(writeSecureEvidence('inv@lid!', 'data')).rejects.toThrow(
        'invalid characters',
      );
    });

    it('rejects overly long task ID', async () => {
      const longId = 'a'.repeat(256);
      await expect(writeSecureEvidence(longId, 'data')).rejects.toThrow(
        'maximum length',
      );
    });

    it('writes evidence to local storage with correct permissions', async () => {
      const securePath = path.join(os.homedir(), 'test-evidence');
      process.env.APEX_EVIDENCE_STORAGE = securePath;
      const filepath = await writeSecureEvidence('task-123', '{"ok":true}');
      expect(filepath).toBe(path.join(securePath, 'task-123.json'));
      expect(fsp.writeFile).toHaveBeenCalledWith(
        filepath,
        '{"ok":true}',
        { mode: 0o600, flag: 'w', encoding: 'utf-8' },
      );
    });

    it('uses custom extension', async () => {
      const securePath = path.join(os.homedir(), 'test-evidence');
      process.env.APEX_EVIDENCE_STORAGE = securePath;
      const filepath = await writeSecureEvidence('task-456', 'log data', 'log');
      expect(filepath).toBe(path.join(securePath, 'task-456.log'));
    });
  });

  describe('generateEvidenceHash', () => {
    it('produces 64-char hex SHA-256 hash', () => {
      const hash = generateEvidenceHash('hello world');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it('is deterministic', () => {
      expect(generateEvidenceHash('data')).toBe(generateEvidenceHash('data'));
    });

    it('differs for different inputs', () => {
      expect(generateEvidenceHash('a')).not.toBe(generateEvidenceHash('b'));
    });
  });

  describe('cleanupEvidenceDir', () => {
    it('does nothing for s3 backend', async () => {
      process.env.APEX_EVIDENCE_STORAGE = 's3://bucket';
      await cleanupEvidenceDir();
      expect(fsp.rm).not.toHaveBeenCalled();
    });

    it('does nothing when path does not contain PID', async () => {
      delete process.env.APEX_EVIDENCE_STORAGE;
      await cleanupEvidenceDir();
      expect(fsp.rm).not.toHaveBeenCalled();
    });
  });
});
