
import { performance } from 'node:perf_hooks';

// Mock Context
const ctx = {
  correlationId: 'test-correlation-id',
  startTime: Date.now(),
  riskLane: 'GREEN',
  userId: 'test-user',
};

// Payload simulating a realistic large object
const largePayload = {
  foo: 'bar',
  nested: {
    array: new Array(100).fill('test-data'),
    data: 'some-random-string'.repeat(100),
  },
  meta: {
    ts: Date.now(),
    source: 'benchmark',
  }
};

// Current Implementation (Sync)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logSync(ctx: any, event: string, data?: Record<string, unknown>): void {
  const latencyMs = Date.now() - ctx.startTime;
  // Simulating the work done in console.log with JSON.stringify
  const msg = `[OmniPort] [${ctx.correlationId}] [${latencyMs}ms] ${event} ` + (data ? JSON.stringify(data) : '');
  const _ = msg;
}

// Optimized Implementation (Async/Non-blocking)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logAsync(ctx: any, event: string, data?: Record<string, unknown>): void {
  // Capture values needed immediately
  const latencyMs = Date.now() - ctx.startTime;

  // Offload to microtask
  Promise.resolve().then(() => {
    const msg = `[OmniPort] [${ctx.correlationId}] [${latencyMs}ms] ${event} ` + (data ? JSON.stringify(data) : '');
    // Actual logging would happen here
    const _ = msg;
  });
}

const ITERATIONS = 10000;

console.log('Starting Benchmark...');

// Measure Sync
const startSync = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  logSync(ctx, 'TEST_EVENT', largePayload);
}
const endSync = performance.now();
const timeSync = endSync - startSync;
console.log(`Sync Logging (Baseline): ${timeSync.toFixed(2)}ms for ${ITERATIONS} ops`);
console.log(`Avg per op: ${(timeSync / ITERATIONS).toFixed(4)}ms`);

// Measure Async (Main Thread Blocking Time)
const startAsync = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  logAsync(ctx, 'TEST_EVENT', largePayload);
}
const endAsync = performance.now();
const timeAsync = endAsync - startAsync;

console.log(`Async Logging (Main Thread): ${timeAsync.toFixed(2)}ms for ${ITERATIONS} ops`);
console.log(`Avg per op: ${(timeAsync / ITERATIONS).toFixed(4)}ms`);

// Wait for async tasks to clear (just to be clean)
await new Promise(resolve => setTimeout(resolve, 100));

const improvement = timeSync / timeAsync;
console.log(`\nSpeedup Factor (Main Thread Unblocking): ${improvement.toFixed(2)}x`);
