import { describe, expect, it } from 'vitest';
import { getPlayableMediaKind, sanitizeFilename } from '../dashboard/lib/omniMediaCatalog';

describe('getPlayableMediaKind', () => {
  it('resolves every allowlisted video MIME type to "video"', () => {
    expect(getPlayableMediaKind('video/mp4')).toBe('video');
    expect(getPlayableMediaKind('video/webm')).toBe('video');
    expect(getPlayableMediaKind('video/ogg')).toBe('video');
  });

  it('resolves every allowlisted audio MIME type to "audio"', () => {
    expect(getPlayableMediaKind('audio/mpeg')).toBe('audio');
    expect(getPlayableMediaKind('audio/mp4')).toBe('audio');
    expect(getPlayableMediaKind('audio/aac')).toBe('audio');
    expect(getPlayableMediaKind('audio/ogg')).toBe('audio');
    expect(getPlayableMediaKind('audio/wav')).toBe('audio');
    expect(getPlayableMediaKind('audio/webm')).toBe('audio');
  });

  it('returns null for non-playable MIME types', () => {
    expect(getPlayableMediaKind('application/pdf')).toBeNull();
    expect(getPlayableMediaKind('image/png')).toBeNull();
    expect(getPlayableMediaKind('text/plain')).toBeNull();
    expect(getPlayableMediaKind('')).toBeNull();
  });

  it('never derives a kind from a filename — a renamed binary cannot masquerade as media', () => {
    // A .mp4-named file with a non-media MIME type (e.g. spoofed extension) must
    // be rejected: detection is MIME-only, never filename-based.
    expect(getPlayableMediaKind('application/octet-stream')).toBeNull();
  });
});

describe('sanitizeFilename', () => {
  it('keeps letters, digits, dot, dash, underscore unchanged', () => {
    expect(sanitizeFilename('my-video_01.mp4')).toBe('my-video_01.mp4');
  });

  it('replaces unsafe characters with underscores', () => {
    expect(sanitizeFilename('my video (final)!.mp4')).toBe('my_video__final__.mp4');
  });

  it('strips path separators so it cannot escape its storage segment', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('.._.._etc_passwd');
  });

  it('falls back to "upload" when sanitization empties the name', () => {
    expect(sanitizeFilename('')).toBe('upload');
  });
});
