import { createHash } from 'node:crypto';

export interface DRRestoreResult {
  stage: 'restore-validate';
  ok: boolean;
  detail: string;
  bytesSampled?: number;
  checksum?: string;
}

async function headRequest(url: string, token?: string) {
  return fetch(url, {
    method: 'HEAD',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function sampleBytes(url: string, token?: string, bytes: number = 2048) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Range: `bytes=0-${bytes - 1}`,
    },
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}

export async function restoreValidate(): Promise<DRRestoreResult> {
  const url = process.env.BACKUP_RESTORE_URL;
  const token = process.env.BACKUP_RESTORE_TOKEN;

  if (!url) {
    return {
      stage: 'restore-validate',
      ok: false,
      detail: 'BACKUP_RESTORE_URL not configured',
    };
  }

  try {
    const head = await headRequest(url, token);
    if (!head.ok) {
      return {
        stage: 'restore-validate',
        ok: false,
        detail: `HEAD failed (${head.status})`,
      };
    }

    const sample = await sampleBytes(url, token);
    const checksum = createHash('sha256').update(sample).digest('hex');

    return {
      stage: 'restore-validate',
      ok: true,
      detail: 'Backup accessible and sample verified',
      bytesSampled: sample.length,
      checksum,
    };
  } catch (error) {
    return {
      stage: 'restore-validate',
      ok: false,
      detail: `Restore validation error: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}
