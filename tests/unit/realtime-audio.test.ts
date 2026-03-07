import { describe, it, expect } from 'vitest';
import { encodeAudioForAPI } from '../../src/utils/RealtimeAudio';

describe('encodeAudioForAPI', () => {
  it('should return an empty string for an empty Float32Array', () => {
    const input = new Float32Array(0);
    const result = encodeAudioForAPI(input);
    expect(result).toBe('');
  });

  it('should correctly encode zeros', () => {
    const input = new Float32Array([0, 0]);
    const result = encodeAudioForAPI(input);
    // [0, 0] in Int16 is [0, 0, 0, 0] in bytes
    // btoa('\0\0\0\0') is 'AAAAAA=='
    expect(result).toBe(btoa('\0\0\0\0'));
  });

  it('should correctly encode maximum and minimum values', () => {
    const input = new Float32Array([1.0, -1.0]);
    const result = encodeAudioForAPI(input);
    // 1.0 -> 32767 (0x7FFF) -> [0xFF, 0x7F]
    // -1.0 -> -32768 (0x8000) -> [0x00, 0x80]
    // Binary: \xFF\x7F\x00\x80
    const expectedBinary = String.fromCharCode(0xFF, 0x7F, 0x00, 0x80);
    expect(result).toBe(btoa(expectedBinary));
  });

  it('should clamp values out of range', () => {
    const input = new Float32Array([1.5, -1.5]);
    const result = encodeAudioForAPI(input);
    // 1.5 -> clamped to 1.0 -> 32767 (0x7FFF) -> [0xFF, 0x7F]
    // -1.5 -> clamped to -1.0 -> -32768 (0x8000) -> [0x00, 0x80]
    const expectedBinary = String.fromCharCode(0xFF, 0x7F, 0x00, 0x80);
    expect(result).toBe(btoa(expectedBinary));
  });

  it('should correctly encode intermediate values', () => {
    const input = new Float32Array([0.5, -0.5]);
    const result = encodeAudioForAPI(input);
    // 0.5 -> 0.5 * 32767 = 16383.5 -> 16383 (0x3FFF) -> [0xFF, 0x3F]
    // -0.5 -> -0.5 * 32768 = -16384 (0xC000) -> [0x00, 0xC0]
    const expectedBinary = String.fromCharCode(0xFF, 0x3F, 0x00, 0xC0);
    expect(result).toBe(btoa(expectedBinary));
  });

  it('should handle large arrays and verify chunking logic', () => {
    // 0x8000 bytes = 32768 bytes = 16384 Int16 elements
    // Let's use 20000 elements to ensure it goes over the chunk size
    const length = 20000;
    const input = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      input[i] = (i % 2000) / 1000 - 1; // some varying data
    }

    const result = encodeAudioForAPI(input);

    // Decode base64 back to bytes
    const decoded = atob(result);
    expect(decoded.length).toBe(length * 2);

    // Verify some values
    const uint8Array = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      uint8Array[i] = decoded.charCodeAt(i);
    }

    const int16Array = new Int16Array(uint8Array.buffer);
    expect(int16Array.length).toBe(length);

    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      // Using Math.trunc because of the way float to int works in JS assignment to Int16Array
      // Actually, JS does truncation (rounding towards zero) for bitwise or assignment?
      // "The assignment of a value to an element of a typed array is performed using the abstract operation SetValueInBuffer"
      // "If type is "Int16", let intValue be 𝔽(toInt16(value))."
      // toInt16 uses modulo 2^16.
      // 0.5 * 32767 = 16383.5. int16Array[i] = 16383.5 -> 16383.
      // -0.5 * 32768 = -16384. int16Array[i] = -16384 -> -16384.
      expect(int16Array[i]).toBe(s < 0 ? Math.trunc(s * 0x8000) : Math.trunc(s * 0x7FFF));
    }
  });
});
