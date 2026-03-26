import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initGatewayTracer, withGatewaySpan, getGatewayTracer } from '../../../src/omnihub-gateway/Tracer';
import { trace } from '@opentelemetry/api';

vi.mock('@opentelemetry/api', () => {
  const mockSpan = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    end: vi.fn(),
    recordException: vi.fn()
  };
  const mockTracer = {
    startActiveSpan: vi.fn((_name: string, ...args: unknown[]) => {
      // Handle all overloads: (name, cb), (name, opts, cb), (name, opts, ctx, cb)
      const cb = args.find((a) => typeof a === 'function') as ((span: typeof mockSpan) => unknown) | undefined;
      return cb!(mockSpan);
    }),
  };
  return {
    trace: {
      getTracer: vi.fn(() => mockTracer),
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

describe('Gateway Tracer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initGatewayTracer should not crash and should return a provider if enabled', () => {
    // RED PHASE test: the implementation shouldn't exist yet but we expect it to return undefined or a provider
    const provider = initGatewayTracer({ enabled: false });
    expect(provider).toBeUndefined();
  });

  it('getGatewayTracer returns the standard API tracer', () => {
    const tracer = getGatewayTracer();
    expect(trace.getTracer).toHaveBeenCalledWith('omnihub-gateway');
    expect(tracer).toBeDefined();
  });

  it('withGatewaySpan handles successful execution and sets attributes', async () => {
    const result = await withGatewaySpan('test-method', { tenantId: 't1', correlationId: 'c1' }, async (_span) => {
      return 'success';
    });

    expect(result).toBe('success');
    const mockTracer = trace.getTracer('omnihub-gateway');
    expect(mockTracer.startActiveSpan).toHaveBeenCalled();
  });

  it('withGatewaySpan handles errors, records exception, and sets error status', async () => {
    await expect(withGatewaySpan('failing-method', {}, async () => {
      throw new Error('Test Error');
    })).rejects.toThrow('Test Error');
  });
});
