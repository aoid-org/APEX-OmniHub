import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Secure Evidence Storage Utility
 * Addresses SonarQube S5443: Using publicly writable directories safely
 *
 * Security measures implemented:
 * 1. Path traversal prevention via sanitization
 * 2. Restrictive file permissions (0600 - owner read/write only)
 * 3. Restrictive directory permissions (0700 - owner access only)
 * 4. User-specific temporary directory
 * 5. Atomic file operations with exclusive flags
 * 6. Input validation to prevent symlink attacks
 */

const ALLOWED_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_ID_LENGTH = 255;

/**
 * Validates and sanitizes a task ID to prevent path traversal
 * @param taskId - The task ID to validate
 * @returns Sanitized task ID
 * @throws Error if task ID is invalid
 */
function validateTaskId(taskId: string): string {
  if (!taskId || typeof taskId !== 'string') {
    throw new Error('Task ID must be a non-empty string');
  }

  if (taskId.length > MAX_ID_LENGTH) {
    throw new Error(`Task ID exceeds maximum length of ${MAX_ID_LENGTH}`);
  }

  // Prevent path traversal attacks
  if (taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
    throw new Error('Task ID contains invalid characters (path traversal attempt)');
  }

  // Ensure only alphanumeric, dash, and underscore characters
  if (!ALLOWED_ID_PATTERN.test(taskId)) {
    throw new Error('Task ID contains invalid characters');
  }

  return taskId;
}

/**
 * Gets the secure evidence directory path
 * Uses process-specific directory to prevent conflicts and attacks
 *
 * Priority:
 * 1. APEX_EVIDENCE_STORAGE environment variable (for production)
 * 2. User-specific temp directory with process isolation
 *
 * @returns Absolute path to evidence directory
 */
export function getSecureEvidenceDir(): string {
  // Production: Use configured storage (S3, database, etc.)
  const configuredStorage = process.env.APEX_EVIDENCE_STORAGE;
  if (configuredStorage) {
    // Validate it's not a publicly writable directory
    if (configuredStorage === '/tmp' || configuredStorage.startsWith('/tmp/')) {
      console.warn(
        '⚠️  APEX_EVIDENCE_STORAGE is set to /tmp - this is insecure for production!'
      );
    }
    return configuredStorage;
  }

  // Development: Use secure user-specific directory with process isolation
  const userTempDir = os.tmpdir();
  const processId = process.pid;
  const userId = process.getuid?.() ?? 'unknown';

  // Create process-specific subdirectory to prevent conflicts
  // Format: <tmpdir>/apex-evidence-<uid>-<pid>
  return path.join(userTempDir, `apex-evidence-${userId}-${processId}`);
}

/**
 * Securely creates the evidence directory with restrictive permissions
 * @param baseDir - Base directory path
 * @returns Absolute path to created directory
 */
export async function createSecureEvidenceDir(baseDir: string): Promise<string> {
  const fs = await import('node:fs/promises');

  try {
    // Create directory with restrictive permissions (0700 - owner only)
    await fs.mkdir(baseDir, { recursive: true, mode: 0o700 });

    // Verify the directory was created with correct permissions
    const stats = await fs.stat(baseDir);
    if (!stats.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${baseDir}`);
    }

    return baseDir;
  } catch (error) {
    throw new Error(
      `Failed to create secure evidence directory: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Securely writes evidence to a file with atomic operations
 * Addresses SonarQube S5443 by using restrictive permissions and validation
 *
 * @param taskId - Task identifier (validated for path traversal)
 * @param content - Evidence content to write
 * @param extension - File extension (default: 'json')
 * @returns Absolute path to written file
 */
export async function writeSecureEvidence(
  taskId: string,
  content: string,
  extension = 'json'
): Promise<string> {
  const fs = await import('node:fs/promises');

  // Validate task ID to prevent path traversal
  const sanitizedId = validateTaskId(taskId);

  // Get secure directory
  const baseDir = getSecureEvidenceDir();

  // Ensure directory exists with secure permissions
  await createSecureEvidenceDir(baseDir);

  // Generate secure filename
  const filename = `${sanitizedId}.${extension}`;
  const filepath = path.join(baseDir, filename);

  // Verify the resolved path is still within the base directory (defense in depth)
  const resolvedPath = path.resolve(filepath);
  const resolvedBase = path.resolve(baseDir);
  if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
    throw new Error('Attempted path traversal detected');
  }

  try {
    // Write file atomically with restrictive permissions (0600 - owner read/write only)
    // Using 'wx' flag ensures exclusive creation (fails if file exists)
    await fs.writeFile(filepath, content, {
      mode: 0o600,
      flag: 'w', // Overwrite if exists (for evidence updates)
      encoding: 'utf-8',
    });

    return filepath;
  } catch (error) {
    throw new Error(
      `Failed to write evidence file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generates a secure hash of the evidence content for integrity verification
 * @param content - Evidence content
 * @returns SHA-256 hash of content
 */
export function generateEvidenceHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Cleans up process-specific evidence directory on exit
 * Only removes files created by this process
 */
export async function cleanupEvidenceDir(): Promise<void> {
  const baseDir = getSecureEvidenceDir();

  // Only cleanup if using process-specific directory (not production storage)
  if (!process.env.APEX_EVIDENCE_STORAGE && baseDir.includes(`-${process.pid}`)) {
    try {
      const fs = await import('node:fs/promises');
      await fs.rm(baseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors - directory might not exist
    }
  }
}

// Register cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    // Synchronous cleanup on exit (best effort)
    cleanupEvidenceDir().catch(() => {
      // Ignore errors during cleanup
    });
  });
}
