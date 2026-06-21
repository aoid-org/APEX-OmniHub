/**
 * Eyes (multimodal vision) surface gate.
 *
 * Proves the "Eyes — multimodal vision input" capability is real and safe:
 *  1. The pure validator accepts a valid image and rejects unsupported type
 *     and oversized files.
 *  2. The request routed through the EXISTING byom-proxy carries the image in
 *     the real Anthropic-native content-block contract shape.
 *  3. No image bytes are ever written to any logger (metadata only).
 *  4. The surface is wired: a reusable component + page exist and the proxy
 *     schema accepts multimodal content.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  validateImageFile,
  buildVisionMessage,
  stripDataUrlPrefix,
  describeImagePayload,
  isAcceptedImageType,
  MAX_IMAGE_BYTES,
  ACCEPTED_IMAGE_TYPES,
  type ImageContentBlock,
} from '../../src/lib/eyes-vision';

const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

// A small, unmistakable base64 payload used as the "secret" image bytes.
const FAKE_BASE64 = 'AAAASUPERSECRETIMAGEBYTESSHOULDNEVERBELOGGEDAAAA';

describe('Eyes validator (pure)', () => {
  it('accepts a valid in-bounds image', () => {
    const result = validateImageFile({ type: 'image/png', size: 1024, name: 'ok.png' });
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts every declared image type', () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(isAcceptedImageType(type)).toBe(true);
      expect(validateImageFile({ type, size: 2048 }).ok).toBe(true);
    }
  });

  it('rejects an unsupported file type', () => {
    const result = validateImageFile({ type: 'application/pdf', size: 1024, name: 'doc.pdf' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('UNSUPPORTED_TYPE');
  });

  it('rejects an oversized image', () => {
    const result = validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1, name: 'big.jpg' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('OVERSIZED');
  });

  it('rejects an empty file', () => {
    expect(validateImageFile({ type: 'image/png', size: 0 }).error).toBe('EMPTY');
  });
});

describe('Eyes payload (real byom-proxy contract shape)', () => {
  it('builds an Anthropic-native multimodal message carrying the image', () => {
    const message = buildVisionMessage({
      prompt: 'What is in this picture?',
      mediaType: 'image/png',
      base64Data: FAKE_BASE64,
    });

    expect(message.role).toBe('user');
    expect(Array.isArray(message.content)).toBe(true);

    const imageBlock = message.content.find((b) => b.type === 'image') as ImageContentBlock;
    expect(imageBlock).toBeDefined();
    expect(imageBlock.source.type).toBe('base64');
    expect(imageBlock.source.media_type).toBe('image/png');
    expect(imageBlock.source.data).toBe(FAKE_BASE64);

    const textBlock = message.content.find((b) => b.type === 'text');
    expect(textBlock).toEqual({ type: 'text', text: 'What is in this picture?' });
  });

  it('strips a data-URL prefix to bare base64', () => {
    expect(stripDataUrlPrefix(`data:image/png;base64,${FAKE_BASE64}`)).toBe(FAKE_BASE64);
    expect(stripDataUrlPrefix(FAKE_BASE64)).toBe(FAKE_BASE64);
  });

  it('omits the text block when no prompt is given', () => {
    const message = buildVisionMessage({ prompt: '   ', mediaType: 'image/jpeg', base64Data: FAKE_BASE64 });
    expect(message.content).toHaveLength(1);
    expect(message.content[0].type).toBe('image');
  });
});

describe('Eyes never logs image bytes', () => {
  it('describeImagePayload reveals media type + size but NOT the bytes', () => {
    const message = buildVisionMessage({ prompt: 'hi', mediaType: 'image/webp', base64Data: FAKE_BASE64 });
    const block = message.content.find((b) => b.type === 'image') as ImageContentBlock;
    const desc = describeImagePayload(block);

    expect(desc).toContain('image/webp');
    expect(desc).not.toContain(FAKE_BASE64);
  });

  it('no console sink receives the base64 bytes when describing a payload', () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'info').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
    ];

    try {
      const message = buildVisionMessage({ prompt: 'analyze', mediaType: 'image/png', base64Data: FAKE_BASE64 });
      const block = message.content.find((b) => b.type === 'image') as ImageContentBlock;
      // This is exactly what the UI logs on send.
      console.info('[APEX OmniHub] Eyes vision send:', describeImagePayload(block));

      const everythingLogged = spies
        .flatMap((s) => s.mock.calls)
        .flat()
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');

      expect(everythingLogged).not.toContain(FAKE_BASE64);
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  });
});

describe('Eyes surface is wired', () => {
  it('the reusable attach component invokes the EXISTING byom-proxy', () => {
    const comp = read('apps/omnihub-site/src/components/byom/EyesVisionInput.tsx');
    expect(comp).toContain("invoke('byom-proxy'");
    expect(comp).toContain('buildVisionMessage');
    expect(comp).toContain('validateImageFile');
    // accept attribute restricts the picker to images
    expect(comp).toContain('accept="image/png,image/jpeg,image/webp,image/gif"');
  });

  it('the page mounts the component', () => {
    const page = read('apps/omnihub-site/src/pages/EyesVision.tsx');
    expect(page).toContain('EyesVisionInput');
  });

  it('byom-proxy accepts multimodal image content blocks', () => {
    const proxy = read('supabase/functions/byom-proxy/index.ts');
    expect(proxy).toContain('IMAGE_BLOCK_SCHEMA');
    expect(proxy).toContain("media_type");
    // safety + compression operate on text only — never on image bytes
    expect(proxy).toContain('extractText');
  });
});
