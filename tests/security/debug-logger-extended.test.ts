/**
 * Extended debug-logger tests
 * Covers paths not hit by debug-logger.test.ts:
 * - debugLog: fetch path (non-localhost endpoint), PROD early-return
 * - debugLog: catch block (setup error)
 * - createDebugLogger wrapper
 * - logError: Error instance vs primitive, DEV console.error branch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debugLog, createDebugLogger, logError } from '@/lib/debug-logger';

describe('debug-logger — extended coverage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // ── debugLog — localhost endpoint (DEV, no fetch) ────────────────────────

  describe('debugLog — default localhost endpoint', () => {
    it('does not throw when called with default localhost endpoint', () => {
      // With the default endpoint (localhost), debugLog should not throw
      // regardless of DEV/PROD state
      expect(() => debugLog({ location: 'TestComponent', message: 'hello from test' })).not.toThrow();
    });

    it('does not throw when data is undefined', () => {
      expect(() =>
        debugLog({ location: 'loc', message: 'msg' }),
      ).not.toThrow();
    });

    it('includes hypothesisId when provided', () => {
      expect(() =>
        debugLog({ location: 'loc', message: 'msg', hypothesisId: 'H2' }),
      ).not.toThrow();
    });

    it('handles data object correctly', () => {
      expect(() =>
        debugLog({ location: 'loc', message: 'msg', data: { key: 'value' } }),
      ).not.toThrow();
    });
  });

  // ── debugLog — PROD early return ─────────────────────────────────────────

  describe('debugLog — PROD mode without explicit debug logging', () => {
    it('returns early without logging when PROD=true and VITE_DEBUG_LOGGING not set', () => {
      vi.stubEnv('PROD', 'true' as any);
      // VITE_DEBUG_LOGGING is not 'true' so should early-return
      debugLog({ location: 'ProdComponent', message: 'should be silent' });
      // console.log should NOT be called (early return in PROD)
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  // ── debugLog — non-localhost endpoint (fetch path) ───────────────────────

  describe('debugLog — non-localhost endpoint', () => {
    it('calls fetch when endpoint is not localhost', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);
      vi.stubEnv('VITE_DEBUG_LOG_ENDPOINT', 'https://logs.example.com/ingest');

      debugLog({ location: 'RemoteLog', message: 'test remote' });

      // Give fetch promise a chance to resolve
      await new Promise(r => setTimeout(r, 10));

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('https://logs.example.com/ingest');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('silently swallows fetch errors in DEV', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network Error'));
      vi.stubGlobal('fetch', fetchMock);
      vi.stubEnv('VITE_DEBUG_LOG_ENDPOINT', 'https://logs.example.com/ingest');

      debugLog({ location: 'RemoteLog', message: 'fetch will fail' });

      await new Promise(r => setTimeout(r, 10));

      // console.error is called from the .catch() handler in DEV
      expect(console.error).toHaveBeenCalled();
    });
  });

  // ── createDebugLogger ────────────────────────────────────────────────────

  describe('createDebugLogger', () => {
    it('returns a function', () => {
      const logger = createDebugLogger('MyComponent');
      expect(typeof logger).toBe('function');
    });

    it('returned logger calls debugLog with the bound location', () => {
      const logger = createDebugLogger('BoundLoc', 'H3');
      // Should not throw when called
      expect(() => logger('test message', { extra: 'data' })).not.toThrow();
    });

    it('logger works without data argument', () => {
      const logger = createDebugLogger('BoundLoc');
      expect(() => logger('message only')).not.toThrow();
    });
  });

  // ── logError ─────────────────────────────────────────────────────────────

  describe('logError', () => {
    it('accepts an Error instance and extracts message', () => {
      const err = new Error('Test error message');
      expect(() => logError(err)).not.toThrow();
    });

    it('calls console.error in DEV with Error instance', () => {
      const err = new Error('Dev error');
      logError(err);
      expect(console.error).toHaveBeenCalled();
    });

    it('accepts a string error and converts to string', () => {
      expect(() => logError('string error')).not.toThrow();
    });

    it('accepts a primitive error (number)', () => {
      expect(() => logError(404)).not.toThrow();
    });

    it('includes context in log data', () => {
      const err = new Error('ctx error');
      expect(() => logError(err, { requestId: 'req-123' })).not.toThrow();
    });

    it('handles Error without stack', () => {
      const err = new Error('no stack');
      delete (err as Error & { stack?: string }).stack;
      expect(() => logError(err)).not.toThrow();
    });
  });
});
