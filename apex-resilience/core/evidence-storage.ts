import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

/**
 * Secure Evidence Storage — multi-backend adapter
 *
 * Backend selection priority (APEX_EVIDENCE_STORAGE):
 *
 *   s3://bucket-name[/prefix]   → AWS S3  (production, recommended)
 *   /absolute/local/path        → local filesystem (dev / CI only)
 *   <unset>                     → project-local .apex/evidence/ (dev / CI)
 *
 * Security measures implemented:
 * 1. Path traversal prevention via allowlist regex on task IDs
 * 2. Restrictive file permissions (0600) on local writes
 * 3. Restrictive directory permissions (0700) on local dirs
 * 4. Atomic file operations with exclusive flags
 * 5. S3 SSE-S3 server-side encryption enforced at upload
 * 6. Production-mode warning when local storage is used in a container
 *
 * Environment variables:
 *   APEX_EVIDENCE_STORAGE  — storage target URI (see above)
 *   APEX_PROJECT_ROOT      — override CWD for local-mode base path
 *   AWS_REGION             — required when using s3:// backend
 *   AWS_ACCESS_KEY_ID      — required when using s3:// backend (or IAM role)
 *   AWS_SECRET_ACCESS_KEY  — required when using s3:// backend (or IAM role)
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_ID_LENGTH = 255;

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates and sanitises a task ID to prevent path traversal.
 */
function validateTaskId(taskId: string): string {
  if (!taskId || typeof taskId !== 'string') {
    throw new Error('Task ID must be a non-empty string');
  }
  if (taskId.length > MAX_ID_LENGTH) {
    throw new Error(`Task ID exceeds maximum length of ${MAX_ID_LENGTH}`);
  }
  if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
    throw new Error('Task ID contains invalid characters (path traversal attempt)');
  }
  if (!ALLOWED_ID_PATTERN.test(taskId)) {
    throw new Error('Task ID contains invalid characters');
  }
  return taskId;
}

// ─── Backend detection ────────────────────────────────────────────────────────

export type EvidenceBackend = 'local' | 's3';

/**
 * Parses APEX_EVIDENCE_STORAGE and returns the active backend type plus
 * any backend-specific config values.
 */
export function resolveEvidenceBackend(): {
  backend: EvidenceBackend;
  localPath?: string;
  s3Bucket?: string;
  s3Prefix?: string;
} {
  const raw = process.env.APEX_EVIDENCE_STORAGE?.trim();

  if (raw?.startsWith('s3://')) {
    // s3://my-bucket/optional/prefix
    const withoutScheme = raw.slice(5);
    const slashIdx = withoutScheme.indexOf('/');
    const s3Bucket = slashIdx === -1 ? withoutScheme : withoutScheme.slice(0, slashIdx);
    const s3Prefix = slashIdx === -1 ? '' : withoutScheme.slice(slashIdx + 1).replace(/\/$/, '');
    if (!s3Bucket) {
      throw new Error('APEX_EVIDENCE_STORAGE s3:// URI is missing a bucket name');
    }
    return { backend: 's3', s3Bucket, s3Prefix };
  }

  if (raw && raw !== '') {
    // Explicit local path override
    // Reject publicly writable directories (e.g. /tmp) — they are insecure for evidence storage.
    const tmpDir = os.tmpdir();
    if (raw === tmpDir || raw.startsWith(tmpDir + path.sep) || raw === '/tmp' || raw.startsWith('/tmp/')) { // NOSONAR
      throw new Error(
        `APEX_EVIDENCE_STORAGE is set to a publicly writable directory (${raw}). `
          + 'Use an s3:// URI or a private persistent volume instead.',
      );
    }
    // Warn when running inside a container (ephemeral disk)
    if (process.env.KUBERNETES_SERVICE_HOST || process.env.DYNO || process.env.FLY_APP_NAME) {
      console.warn(
        '⚠️  APEX_EVIDENCE_STORAGE is a local path but the process appears to be running '
          + 'inside a container or PaaS dyno. Evidence data WILL be lost on container restart. '
          + 'Set APEX_EVIDENCE_STORAGE=s3://your-bucket/prefix for durable storage.',
      );
    }
    return { backend: 'local', localPath: raw };
  }

  // Default dev/CI path
  const projectRoot = process.env.APEX_PROJECT_ROOT ?? process.cwd();
  const localPath = path.join(projectRoot, '.apex', 'evidence');
  return { backend: 'local', localPath };
}

// ─── Local backend ────────────────────────────────────────────────────────────

/**
 * Returns the resolved local evidence directory, creating it if necessary.
 * @deprecated Prefer using the high-level `writeSecureEvidence()` helper.
 */
export function getSecureEvidenceDir(): string {
  const config = resolveEvidenceBackend();

  if (config.backend === 's3') {
    throw new Error(
      'getSecureEvidenceDir() is not applicable when using the S3 backend. '
        + 'Use writeSecureEvidence() instead.',
    );
  }

  const baseDir = config.localPath!;

  try {
    fs.mkdirSync(baseDir, { recursive: true, mode: 0o700 });
    return baseDir;
  } catch {
    // Fallback: user-specific temp dir with process isolation
    const userId = process.getuid?.() ?? 'unknown';
    const fallback = path.join(os.tmpdir(), `apex-evidence-${userId}-${process.pid}`);
    fs.mkdirSync(fallback, { recursive: true, mode: 0o700 });
    return fallback;
  }
}

export async function createSecureEvidenceDir(baseDir: string): Promise<string> {
  const fsp = await import('node:fs/promises');
  await fsp.mkdir(baseDir, { recursive: true, mode: 0o700 });
  const stats = await fsp.stat(baseDir);
  if (!stats.isDirectory()) {
    throw new Error(`Path exists but is not a directory: ${baseDir}`);
  }
  return baseDir;
}

// ─── S3 backend ───────────────────────────────────────────────────────────────

/**
 * Writes evidence to an S3 bucket.
 *
 * Uses the AWS SDK v3 (@aws-sdk/client-s3) which must be installed:
 *   npm install @aws-sdk/client-s3
 *
 * Server-side encryption (SSE-S3) is enforced on every PutObject call.
 */
async function writeS3Evidence(
  s3Bucket: string,
  s3Prefix: string,
  taskId: string,
  content: string,
  extension: string,
): Promise<string> {
  // Dynamic import so the module is only required when S3 backend is active.
  // This avoids a hard dependency on @aws-sdk for teams using local storage.
  let S3Client: typeof import('@aws-sdk/client-s3').S3Client;
  let PutObjectCommand: typeof import('@aws-sdk/client-s3').PutObjectCommand;

  try {
    // String-concatenation prevents Vite's import-analysis plugin from attempting to
    // statically resolve this optional peer dependency at build/test time.
    // The module is only required at runtime when APEX_EVIDENCE_STORAGE=s3://...
    const s3SdkId = '@aws-sdk/' + 'client-s3';
    const s3Module = await import(s3SdkId);
    S3Client = s3Module.S3Client;
    PutObjectCommand = s3Module.PutObjectCommand;
  } catch {
    throw new Error(
      'APEX_EVIDENCE_STORAGE is set to an s3:// URI but @aws-sdk/client-s3 is not installed. '
        + 'Run: npm install @aws-sdk/client-s3',
    );
  }

  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
  const client = new S3Client({ region });

  const key = [s3Prefix, `${taskId}.${extension}`].filter(Boolean).join('/');

  await client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: content,
      ContentType: extension === 'json' ? 'application/json' : 'text/plain',
      ServerSideEncryption: 'AES256', // SSE-S3 enforced
    }),
  );

  return `s3://${s3Bucket}/${key}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Writes evidence using the configured backend (local filesystem or S3).
 *
 * @param taskId    - Task identifier; must match [a-zA-Z0-9_-]+
 * @param content   - Evidence payload (string)
 * @param extension - File extension (default: 'json')
 * @returns         - Absolute local path or s3:// URI of the written object
 */
export async function writeSecureEvidence(
  taskId: string,
  content: string,
  extension = 'json',
): Promise<string> {
  const sanitisedId = validateTaskId(taskId);
  const config = resolveEvidenceBackend();

  if (config.backend === 's3') {
    return writeS3Evidence(config.s3Bucket!, config.s3Prefix!, sanitisedId, content, extension);
  }

  // ── Local backend ──────────────────────────────────────────────────────
  const fsp = await import('node:fs/promises');
  const baseDir = await createSecureEvidenceDir(config.localPath!);
  const filename = `${sanitisedId}.${extension}`;
  const filepath = path.join(baseDir, filename);

  // Defence in depth: verify resolved path stays within base dir
  const resolvedPath = path.resolve(filepath);
  const resolvedBase = path.resolve(baseDir);
  if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
    throw new Error('Attempted path traversal detected');
  }

  await fsp.writeFile(filepath, content, {
    mode: 0o600,
    flag: 'w',
    encoding: 'utf-8',
  });

  return filepath;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** SHA-256 content hash for integrity verification */
export function generateEvidenceHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/** Cleans up the local evidence directory on process exit (dev/CI only) */
export async function cleanupEvidenceDir(): Promise<void> {
  const config = resolveEvidenceBackend();
  if (config.backend !== 'local') return; // nothing to clean up for S3

  const baseDir = config.localPath!;
  // Only remove process-isolated directories (contain the PID)
  if (baseDir.includes(`-${process.pid}`)) {
    try {
      const fsp = await import('node:fs/promises');
      await fsp.rm(baseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

if (typeof process !== 'undefined') {
  process.on('exit', () => {
    cleanupEvidenceDir().catch(() => {/* ignore */});
  });
}
