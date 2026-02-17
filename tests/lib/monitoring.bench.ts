import { bench, describe, vi } from 'vitest';
import { logPerformance, clearLogs, logError } from '../../src/lib/monitoring';

describe('monitoring performance', () => {
  // Suppress console.log and console.error globally for this suite
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};

  const event = {
    name: 'benchmark_event',
    duration: 123,
    timestamp: Date.now(),
    metadata: { foo: 'bar', baz: 123 },
  };

  bench('logPerformance (batched)', () => {
    logPerformance(event);
  }, {
    setup: () => {
      localStorage.clear();
      clearLogs();
    },
    teardown: () => {
      localStorage.clear();
    },
    iterations: 1000,
  });

  bench('logError (immediate)', async () => {
    await logError(new Error('test error'));
  }, {
    setup: () => {
      localStorage.clear();
      clearLogs();
    },
    teardown: () => {
      localStorage.clear();
    },
    iterations: 100,
  });
});
