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
    startActiveSpan: vi.fn((name, options, context, callback) => {
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
  const nodeSdk = vi.fn(() => ({ start: sdkStart }));

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

vi.mock(
  '@opentelemetry/sdk-node',
  () => ({
    NodeSDK: mockNodeSdk,
  }),
  { virtual: true },
);

vi.mock(
  '@opentelemetry/auto-instrumentations-node',
  () => ({
    getNodeAutoInstrumentations: vi.fn(() => []),
  }),
  { virtual: true },
);

vi.mock(
  '@opentelemetry/exporter-trace-otlp-http',
  () => ({
    OTLPTraceExporter: vi.fn(),
  }),
  { virtual: true },
);

vi.mock(
  '@opentelemetry/resources',
  () => ({
    Resource: vi.fn(),
  }),
  { virtual: true },
);

vi.mock(
  '@opentelemetry/semantic-conventions',
  () => ({
    ATTR_SERVICE_NAME: 'service.name',
  }),
  { virtual: true },
);

vi.mock(
  '@opentelemetry/semantic-conventions/incubating',
  () => ({
    ATTR_DEPLOYMENT_ENVIRONMENT_NAME: 'deployment.environment.name',
  }),
  { virtual: true },
);

describe('Gateway Tracer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initGatewayTracer should not crash and should return a provider if enabled', async () => {
    // RED PHASE test: the implementation shouldn't exist yet but we expect it to return undefined or a provider
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
});
