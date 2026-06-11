import { describe, it, expect } from 'vitest';
import { compress, compressJsonPayload } from '../src/pipeline/compress';
import { decompressJsonPayload } from '../src/pipeline/decompress';

describe('Compression Pipeline', () => {
  it('chains text compression phases', () => {
    const input = 'Please note that in order to test this, you must run it. Please note that in order to test this, you must run it.';
    const result = compress(input);
    expect(result.reductionPercent).toBeGreaterThan(0);
    expect(result.phasesApplied).toContain('heuristic-pruner');
    expect(result.phasesApplied).toContain('telegraph-english');
    expect(result.compressed).toBe('to test this, run it.');
  });

  it('integrates TOON roundtripping', () => {
    const obj = { message: 'hello world', active: true };
    const toon = compressJsonPayload(obj);
    const restored = decompressJsonPayload(toon);
    expect(restored).toEqual(obj);
  });
});
