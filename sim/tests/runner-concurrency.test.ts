import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimulationRunner, type Beat } from '../runner';
import { DEFAULT_CHAOS_CONFIG } from '../chaos-engine';

const originalEnv = {
  SIM_MODE: process.env.SIM_MODE,
  SANDBOX_TENANT: process.env.SANDBOX_TENANT,
  SUPABASE_URL: process.env.SUPABASE_URL,
};

function buildBeats(): Beat[] {
  return [
    {
      number: 1,
      name: 'Beat 1',
      app: 'tradeline247',
      eventType: 'tradeline247:call.completed',
      payload: { callId: 'b1', outcome: 'answered' },
      expectedOutcome: 'Processed',
      observability: 'events table',
    },
    {
      number: 2,
      name: 'Beat 2',
      app: 'omnihub',
      eventType: 'omnihub:lead.created',
      payload: { leadId: 'b2' },
      expectedOutcome: 'Processed',
      observability: 'events table',
    },
    {
      number: 3,
      name: 'Beat 3',
      app: 'apexsocial',
      eventType: 'apexsocial:post.published',
      payload: { postId: 'b3' },
      expectedOutcome: 'Processed',
      observability: 'events table',
    },
  ];
}

afterEach(() => {
  process.env.SIM_MODE = originalEnv.SIM_MODE;
  process.env.SANDBOX_TENANT = originalEnv.SANDBOX_TENANT;
  process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
  vi.restoreAllMocks();
});

describe('SimulationRunner bounded concurrency', () => {
  it('preserves deterministic beat ordering in result aggregation', async () => {
    process.env.SIM_MODE = 'true';
    process.env.SANDBOX_TENANT = 'sandbox-test';
    process.env.SUPABASE_URL = 'http://localhost:54321';

    const runner = new SimulationRunner({
      scenario: 'bounded-concurrency',
      tenantId: 'sandbox-test',
      seed: 42,
      chaos: {
        ...DEFAULT_CHAOS_CONFIG,
        timeoutRate: 0,
        networkFailureRate: 0,
        serverErrorRate: 0,
        delayRate: 0,
      },
      beats: buildBeats(),
      dryRun: true,
      verbose: false,
      maxConcurrentBeats: 3,
    });

    const result = await runner.run();

    expect(result.beats.map((entry) => entry.beat.number)).toEqual([1, 2, 3]);
    expect(result.beats.every((entry) => entry.success)).toBe(true);
  });
});
