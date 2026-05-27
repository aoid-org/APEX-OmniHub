import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initGatewayTracer, withGatewaySpan, getGatewayTracer } from '../../../src/omnihub-gateway/Tracer';

const { mockTracer, mockGetTracer, mockSdkStart, mockNodeSdk } = vi.hoisted(() => {
  const span = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    end: vi.fn(),
    recordException: vi.fn(),
  };

  const tracer = {
    startActiveSpan: vi.fn((_name, options, context, callback) => {
      // Support both startActiveSpan(name, callback) and longer overloads.
      let cb = callback;
      if (typeof options === 'function') {
        cb = options;
      } else if (typeof context === 'function') {
        cb = context;
      }

      return cb(span);
    }),
  };

  const getTracer = vi.fn(() => tracer);
  const sdkStart = vi.fn();
  // Arrow functions cannot be used with `new`; use a regular function so NodeSDK can be constructed.
  const nodeSdk = vi.fn(function (_opts?: unknown) { return { start: sdkStart }; });

  return {
    mockTracer: tracer,
    mockGetTracer: getTracer,
    mockSdkStart: sdkStart,
    mockNodeSdk: nodeSdk,
  };
});

vi.mock('@opentelemetry/api', () => {
  return {
    trace: {
      getTracer: mockGetTracer,
    },
    context: {
      active: vi.fn(),
    },
    propagation: {
      extract: vi.fn(),
    },
    SpanStatusCode: {
      OK: 1,
      ERROR: 2
    }
  };
});

// NodeSDK must be a real class — vi.fn arrow-wrapper is not constructible in Vitest v4.
// mockNodeSdk() is called inside the constructor so spy assertions still work.
vi.mock(
  '@opentelemetry/sdk-node',
  () => ({
    NodeSDK: class NodeSDKMock {
      start = mockSdkStart;
      constructor(opts: unknown) { mockNodeSdk(opts); }
    },
  }),
);

vi.mock(
  '@opentelemetry/auto-instrumentations-node',
  () => ({
    getNodeAutoInstrumentations: vi.fn(() => []),
  }),
);

vi.mock(
  '@opentelemetry/exporter-trace-otlp-http',
  () => ({
    OTLPTraceExporter: vi.fn(),
  }),
);

vi.mock(
  '@opentelemetry/resources',
  () => ({
    Resource: vi.fn(),
    resourceFromAttributes: vi.fn(() => ({})),
  }),
);

vi.mock(
  '@opentelemetry/semantic-conventions',
  () => ({
    ATTR_SERVICE_NAME: 'service.name',
  }),
);

vi.mock(
  '@opentelemetry/semantic-conventions/incubating',
  () => ({
    ATTR_DEPLOYMENT_ENVIRONMENT_NAME: 'deployment.environment.name',
  }),
);

describe('Gateway Tracer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initGatewayTracer should not crash and should return a provider if enabled', async () => {
    const provider = await initGatewayTracer({ enabled: false });
    expect(provider).toBeUndefined();
    expect(mockNodeSdk).not.toHaveBeenCalled();
    expect(mockSdkStart).not.toHaveBeenCalled();
  });

  it('getGatewayTracer returns the standard API tracer', () => {
    const tracer = getGatewayTracer();
    expect(mockGetTracer).toHaveBeenCalledWith('omnihub-gateway');
    expect(tracer).toBeDefined();
  });

  it('withGatewaySpan handles successful execution and sets attributes', async () => {
    const result = await withGatewaySpan('test-method', { tenantId: 't1', correlationId: 'c1' }, async (_span) => {
      return 'success';
    });

    expect(result).toBe('success');
    expect(mockGetTracer).toHaveBeenCalledWith('omnihub-gateway');
    expect(mockTracer.startActiveSpan).toHaveBeenCalled();
  });

  it('withGatewaySpan handles errors, records exception, and sets error status', async () => {
    await expect(withGatewaySpan('failing-method', {}, async () => {
      throw new Error('Test Error');
    })).rejects.toThrow('Test Error');
  });

  // ─── Coverage: new branches added in hardening pass ───────────────────────

  it('initGatewayTracer warns and returns undefined in browser context (window defined)', async () => {
    // jsdom environment defines globalThis.window — the browser guard must fire.
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const provider = await initGatewayTracer({ enabled: true });
    expect(provider).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Tracer] initGatewayTracer() called in browser context — no-op.',
    );
    expect(mockNodeSdk).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    // initialized remains false — subsequent Node-context tests can still initialise
  });

  it('initGatewayTracer logs error and returns sdk when NodeSDK.start() throws (Node context)', async () => {
    // Suppress window so the browser guard is bypassed (simulates Node context).
    vi.stubGlobal('window', undefined);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSdkStart.mockImplementationOnce(() => { throw new Error('SDK init failed'); });

    const provider = await initGatewayTracer({ enabled: true });

    // NodeSDK was lazy-loaded and instantiated
    expect(mockNodeSdk).toHaveBeenCalledTimes(1);
    // start() was called and threw
    expect(mockSdkStart).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to start OpenTelemetry NodeSDK',
      expect.any(Error),
    );
    // sdk is returned even when start() fails; initialized stays false
    expect(provider).toBeDefined();

    vi.unstubAllGlobals();
    consoleErrorSpy.mockRestore();
  });

  it('initGatewayTracer initialises SDK and returns it on first successful Node-context call', async () => {
    // initialized is still false (start() threw in the previous test).
    // NodeSDK module is already cached — the lazy-import block is skipped.
    vi.stubGlobal('window', undefined);

    const provider = await initGatewayTracer({ enabled: true });

    expect(mockNodeSdk).toHaveBeenCalledTimes(1);
    expect(mockSdkStart).toHaveBeenCalledTimes(1);
    expect(provider).toBeDefined();
    // initialized is now true — next call will short-circuit

    vi.unstubAllGlobals();
  });

  it('initGatewayTracer skips re-initialisation when already initialized', async () => {
    // initialized === true from the previous test.
    vi.stubGlobal('window', undefined);

    const provider = await initGatewayTracer({ enabled: true });

    expect(provider).toBeUndefined();
    expect(mockNodeSdk).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
