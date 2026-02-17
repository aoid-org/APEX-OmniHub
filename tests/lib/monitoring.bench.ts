import { bench, describe } from 'vitest';
import { logPerformance, clearLogs, logError } from '../../src/lib/monitoring';

describe('monitoring performance', () => {
  // Suppress console.log and console.error globally for this suite
  // Note: we don't restore them because benchmark runs in isolation/teardown isn't strictly necessary for CI benchmark
  // But cleaner to just suppress and let process exit.
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
