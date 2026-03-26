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
      const cb =
        typeof options === 'function'
          ? options
          : typeof context === 'function'
            ? context
            : callback;
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
    SemanticResourceAttributes: {
      SERVICE_NAME: 'service.name',
      DEPLOYMENT_ENVIRONMENT: 'deployment.environment',
    },
  }),
  { virtual: true },
);

describe('Gateway Tracer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initGatewayTracer should not crash and should return a provider if enabled', () => {
    // RED PHASE test: the implementation shouldn't exist yet but we expect it to return undefined or a provider
    const provider = initGatewayTracer({ enabled: false });
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
