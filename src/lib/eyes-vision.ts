/**
 * Eyes — multimodal vision input core.
 *
 * Pure, framework-free helpers for the "Eyes" capability: client-side image
 * validation and construction of the multimodal request payload sent through
 * the EXISTING `byom-proxy` edge function.
 *
 * This module deliberately contains NO React and NO Supabase imports so it can
 * be unit-tested in isolation and reused by both the site UI and tests.
 *
 * SECURITY INVARIANT: this module never logs image bytes. Callers must not log
 * `data`/`base64` fields either. The only loggable surface is the metadata
 * returned by {@link describeImagePayload} (media type + byte size, no bytes).
 */

/** Image media types accepted by the vision pipeline (Anthropic-supported). */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** Maximum accepted image size, in bytes (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Minimal file-like shape — works with the DOM `File` and plain test doubles. */
export interface ImageFileLike {
  readonly type: string;
  readonly size: number;
  readonly name?: string;
}

export type ImageValidationError =
  | 'UNSUPPORTED_TYPE'
  | 'OVERSIZED'
  | 'EMPTY';

export interface ImageValidationResult {
  readonly ok: boolean;
  readonly error?: ImageValidationError;
  readonly message?: string;
}

/**
 * Validate an image file client-side BEFORE any read/upload.
 *
 * Rejects unsupported MIME types, empty files, and files over
 * {@link MAX_IMAGE_BYTES}. Returns a structured result so the UI can render a
 * safe, specific message without throwing.
 */
export function validateImageFile(file: ImageFileLike): ImageValidationResult {
  if (!file || file.size <= 0) {
    return { ok: false, error: 'EMPTY', message: 'The selected file is empty.' };
  }

  if (!isAcceptedImageType(file.type)) {
    return {
      ok: false,
      error: 'UNSUPPORTED_TYPE',
      message: `Unsupported file type "${file.type || 'unknown'}". Use PNG, JPEG, WebP, or GIF.`,
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: 'OVERSIZED',
      message: `Image is ${mb} MB. The maximum is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  return { ok: true };
}

/** Type guard: is the given MIME type one of the accepted image types? */
export function isAcceptedImageType(type: string): type is AcceptedImageType {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

// ── Multimodal content blocks (Anthropic-native shape) ─────────────────────────

export interface TextContentBlock {
  readonly type: 'text';
  readonly text: string;
}

export interface ImageContentBlock {
  readonly type: 'image';
  readonly source: {
    readonly type: 'base64';
    readonly media_type: AcceptedImageType;
    /** Base64-encoded image bytes. NEVER log this field. */
    readonly data: string;
  };
}

export type ContentBlock = TextContentBlock | ImageContentBlock;

/** A multimodal user message: content is an ordered array of blocks. */
export interface MultimodalMessage {
  readonly role: 'user';
  readonly content: readonly ContentBlock[];
}

export interface BuildVisionMessageInput {
  /** The user's typed prompt. */
  readonly prompt: string;
  /** The validated image's media type. */
  readonly mediaType: AcceptedImageType;
  /** Base64 image bytes (no data-URL prefix). */
  readonly base64Data: string;
}

/**
 * Build a single multimodal user message in the exact content-block shape the
 * (extended) byom-proxy contract accepts. Image block precedes the text block,
 * which is the recommended ordering for vision prompts.
 */
export function buildVisionMessage(input: BuildVisionMessageInput): MultimodalMessage {
  const blocks: ContentBlock[] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: input.mediaType, data: input.base64Data },
    },
  ];
  const prompt = input.prompt.trim();
  if (prompt.length > 0) {
    blocks.push({ type: 'text', text: prompt });
  }
  return { role: 'user', content: blocks };
}

/**
 * Strip a `data:<mime>;base64,` prefix from a data URL, returning the bare
 * base64 payload. If the input has no prefix it is returned unchanged.
 */
export function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  if (dataUrl.startsWith('data:') && comma !== -1) {
    return dataUrl.slice(comma + 1);
  }
  return dataUrl;
}

/**
 * Loggable description of an image payload — media type + byte size ONLY.
 * Use this anywhere a log line wants to reference an attachment. It deliberately
 * does NOT include the base64 bytes.
 */
export function describeImagePayload(block: ImageContentBlock): string {
  const approxBytes = Math.floor((block.source.data.length * 3) / 4);
  return `image(${block.source.media_type}, ~${approxBytes}B)`;
}
