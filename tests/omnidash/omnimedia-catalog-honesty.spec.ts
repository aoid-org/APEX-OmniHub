/**
 * OmniMedia catalog client — error-honesty contract.
 *
 * APEX Bible rule: raw SDK / Edge Function error strings (e.g. the Supabase
 * FunctionsHttpError message "Edge Function returned a non-2xx status code") must NEVER
 * propagate out of the OmniMedia data layer. Every failure collapses to a stable,
 * user-safe OmniMediaError code. OmniMedia owns the media error surface; omnilink-port is
 * only the backend dependency and its implementation language must not leak.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import {
  fetchOmniMediaCatalog,
  ingestUploadedMedia,
  deleteOmniMediaAsset,
  OmniMediaError,
} from '@/dashboard/lib/omniMediaCatalog';

const RAW_SDK = 'Edge Function returned a non-2xx status code';

/** Awaits a rejecting call and returns the thrown error with a precise type for assertions. */
async function captureError(fn: () => Promise<unknown>): Promise<Error> {
  try {
    await fn();
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected promise to reject');
}

describe('omniMediaCatalog error honesty', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('collapses a non-2xx FunctionsHttpError into a stable code, never the raw SDK string', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: RAW_SDK } });

    await expect(fetchOmniMediaCatalog()).rejects.toMatchObject({
      name: 'OmniMediaError',
      code: 'omnimedia_catalog_failed',
    });

    // Prove the raw SDK / backend wording is gone from anything that could reach the UI.
    const err = await captureError(() => fetchOmniMediaCatalog());
    expect(err).toBeInstanceOf(OmniMediaError);
    expect(err.message).toBe('omnimedia_catalog_failed');
    expect(err.message).not.toContain(RAW_SDK);
    expect(err.message.toLowerCase()).not.toContain('non-2xx');
    expect(err.message).not.toContain('omnilink');
  });

  it('returns items on success and tolerates an empty owned catalog', async () => {
    invoke.mockResolvedValue({ data: { items: [], expires_in: 3600 }, error: null });
    await expect(fetchOmniMediaCatalog()).resolves.toEqual([]);

    invoke.mockResolvedValue({
      data: { items: [{ id: 'a', title: 'Clip', kind: 'video', source: 'https://x/y', is_external: false, created_at: 't' }], expires_in: 3600 },
      error: null,
    });
    const items = await fetchOmniMediaCatalog();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('a');
  });

  it('sanitizes ingest and delete failures to stable codes too', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: RAW_SDK } });
    await expect(
      ingestUploadedMedia({ storagePath: 'u/clip.mp4', title: 'Clip', kind: 'video' }),
    ).rejects.toMatchObject({ name: 'OmniMediaError', code: 'omnimedia_ingest_failed' });

    await expect(deleteOmniMediaAsset('id-1')).rejects.toMatchObject({
      name: 'OmniMediaError',
      code: 'omnimedia_delete_failed',
    });
  });

  it('converts a thrown network/timeout rejection into a stable code (no raw leak)', async () => {
    invoke.mockRejectedValue(new Error(RAW_SDK));
    const err = await captureError(() => fetchOmniMediaCatalog());
    expect(err).toBeInstanceOf(OmniMediaError);
    expect(err.message).toBe('omnimedia_catalog_failed');
  });
});
