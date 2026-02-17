import { bench, describe } from 'vitest';
import { logPerformance, clearLogs } from '../../src/lib/monitoring';

describe('monitoring performance', () => {
  const event = {
    name: 'benchmark_event',
    duration: 123,
    timestamp: Date.now(),
    metadata: { foo: 'bar', baz: 123 },
  };

  bench('logPerformance', () => {
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
});
