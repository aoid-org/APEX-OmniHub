/**
 * omniMediaCatalog — Shared client for the OmniMedia edge routes (contract §7/§8/§9).
 *
 * Mirrors the invoke/timeout pattern in useOmniModuleState.ts. Every call requires an
 * authenticated session — the edge routes enforce ownership via RLS, this client never
 * does its own authorization.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { supabase } from '@/lib/supabase';

const CATALOG_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('omnimedia_catalog_timeout')), ms),
    ),
  ]);
}

/**
 * Stable, user-safe error codes. The OmniMedia UI maps these to honest copy — it must NEVER
 * render a raw SDK/Edge string. In particular, a Supabase FunctionsHttpError carries the
 * message "Edge Function returned a non-2xx status code"; surfacing that verbatim is a
 * forbidden fake/raw-error surface, so every failure is collapsed to one of these codes.
 */
export type OmniMediaErrorCode =
  | 'omnimedia_catalog_failed'
  | 'omnimedia_ingest_failed'
  | 'omnimedia_delete_failed';

export class OmniMediaError extends Error {
  readonly code: OmniMediaErrorCode;
  constructor(code: OmniMediaErrorCode) {
    super(code);
    this.name = 'OmniMediaError';
    this.code = code;
  }
}

/**
 * Collapses any raw invoke/SDK/timeout failure into a stable OmniMediaError. The raw cause is
 * logged for developers only — it is never thrown onward, so backend implementation language
 * (omnilink-port, non-2xx, FunctionsHttpError) can never reach the OmniMedia surface.
 */
function failOmniMedia(code: OmniMediaErrorCode, cause: unknown): never {
  if (cause) console.warn(`[omnimedia] ${code}:`, cause);
  throw new OmniMediaError(code);
}

export type OmniMediaKind = 'video' | 'audio';

/** Mirrors the bucket's allowed_mime_types in 20260628000000_omnimedia_pipeline.sql. */
const PLAYABLE_MEDIA_MIME_TYPES: Readonly<Record<string, OmniMediaKind>> = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/aac': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/webm': 'audio',
};

/**
 * Resolves a playable media kind from the browser-sniffed MIME type only — never from
 * the filename extension, so a renamed binary can't masquerade as playable media.
 */
export function getPlayableMediaKind(mimeType: string): OmniMediaKind | null {
  return PLAYABLE_MEDIA_MIME_TYPES[mimeType] ?? null;
}

/** Strips a filename to a safe storage-path segment: letters, digits, dot, dash, underscore. */
export function sanitizeFilename(name: string): string {
  const cleaned = name.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'upload';
}

export interface OmniMediaCatalogItem {
  readonly id: string;
  readonly title: string;
  readonly kind: OmniMediaKind;
  readonly provider: string | null;
  readonly mime_type: string | null;
  readonly source: string | null;
  readonly is_external: boolean;
  readonly created_at: string;
}

interface CatalogResponse {
  readonly items: OmniMediaCatalogItem[];
  readonly expires_in: number;
}

export async function fetchOmniMediaCatalog(): Promise<OmniMediaCatalogItem[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('omnilink-port/omnimedia-catalog', { body: {} }),
      CATALOG_TIMEOUT_MS,
    );
    if (error) failOmniMedia('omnimedia_catalog_failed', error);
    return ((data as CatalogResponse | null)?.items ?? []);
  } catch (err) {
    if (err instanceof OmniMediaError) throw err;
    failOmniMedia('omnimedia_catalog_failed', err);
  }
}

export interface IngestUploadedMediaInput {
  readonly storagePath: string;
  readonly title: string;
  readonly kind: OmniMediaKind;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
}

export async function ingestUploadedMedia(input: IngestUploadedMediaInput): Promise<string> {
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('omnilink-port/omnimedia-ingest-from-upload', {
        body: {
          storage_path: input.storagePath,
          title: input.title,
          kind: input.kind,
          mime_type: input.mimeType,
          size_bytes: input.sizeBytes,
        },
      }),
      CATALOG_TIMEOUT_MS,
    );
    if (error) failOmniMedia('omnimedia_ingest_failed', error);
    const id = (data as { ok?: boolean; id?: string } | null)?.id;
    if (!id) failOmniMedia('omnimedia_ingest_failed', null);
    return id;
  } catch (err) {
    if (err instanceof OmniMediaError) throw err;
    failOmniMedia('omnimedia_ingest_failed', err);
  }
}

export async function deleteOmniMediaAsset(id: string): Promise<void> {
  try {
    const { error } = await withTimeout(
      supabase.functions.invoke('omnilink-port/omnimedia-delete-asset', { body: { id } }),
      CATALOG_TIMEOUT_MS,
    );
    if (error) failOmniMedia('omnimedia_delete_failed', error);
  } catch (err) {
    if (err instanceof OmniMediaError) throw err;
    failOmniMedia('omnimedia_delete_failed', err);
  }
}
