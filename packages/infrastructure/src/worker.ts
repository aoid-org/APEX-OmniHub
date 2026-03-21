/**
 * OmniHub Worker Lambda — Heavy-Lift Async Execution
 * @version 1.0.0
 * @module packages/infrastructure/src/worker
 *
 * This Lambda function is invoked asynchronously by the Temporal
 * dispatchToLambdaActivity. It:
 *
 * 1. Parses the event payload (taskData, userJwt, taskToken).
 * 2. Instantiates a Supabase client with the user's JWT to enforce RLS.
 * 3. Performs the heavy-lift computation.
 * 4. Completes (or fails) the Temporal activity via async callback.
 *
 * SECURITY: Uses the user's JWT + SUPABASE_ANON_KEY — never the service_role key.
 * The Supabase client inherits the user's RLS policies.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { Connection, Client } from '@temporalio/client';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from 'aws-lambda';

// ============================================================================
// Types
// ============================================================================

interface WorkerEvent {
  readonly taskData: Record<string, unknown>;
  readonly userJwt: string;
  readonly taskToken: string; // Base64-encoded Temporal task token
}

interface WorkerResult {
  readonly status: 'completed' | 'failed';
  readonly output?: Record<string, unknown>;
  readonly error?: string;
}

// ============================================================================
// Heavy-Lift Execution (Mock)
// ============================================================================

async function executeHeavyLift(
  taskData: Record<string, unknown>,
  _supabase: ReturnType<typeof createClient>,
): Promise<Record<string, unknown>> {
  // Mock heavy-lift: simulate a 2-second compute-intensive operation.
  // In production, this would perform data transformations, ML inference,
  // batch processing, or other CPU/memory-intensive work.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    processedAt: new Date().toISOString(),
    inputKeys: Object.keys(taskData),
    resultHash: Buffer.from(JSON.stringify(taskData)).toString('base64url').slice(0, 16),
  };
}

// ============================================================================
// Temporal Callback Helpers
// ============================================================================

async function createTemporalClient(): Promise<Client> {
  const address = process.env['TEMPORAL_ADDRESS'] ?? 'localhost:7233';
  const namespace = process.env['TEMPORAL_NAMESPACE'] ?? 'default';

  const connection = await Connection.connect({ address });
  return new Client({ connection, namespace });
}

async function completeActivity(
  taskTokenB64: string,
  result: Record<string, unknown>,
): Promise<void> {
  const client = await createTemporalClient();
  const taskToken = Buffer.from(taskTokenB64, 'base64');

  const handle = client.activity.getCompletionHandle(taskToken);
  await handle.complete(result);
}

async function failActivity(
  taskTokenB64: string,
  error: Error,
): Promise<void> {
  const client = await createTemporalClient();
  const taskToken = Buffer.from(taskTokenB64, 'base64');

  const handle = client.activity.getCompletionHandle(taskToken);
  await handle.fail(error);
}

// ============================================================================
// Lambda Handler
// ============================================================================

export const handler: Handler<WorkerEvent, WorkerResult> = async (event) => {
  const { taskData, userJwt, taskToken } = event;

  if (!taskData || !userJwt || !taskToken) {
    const err = new Error('Missing required fields: taskData, userJwt, taskToken');
    await failActivity(taskToken ?? '', err).catch(() => {
      // If we can't even fail the activity, there's nothing more to do.
      // The Temporal activity will eventually time out.
    });
    return { status: 'failed', error: err.message };
  }

  // Supabase client with user's JWT — enforces RLS policies.
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseAnonKey = process.env['SUPABASE_ANON_KEY']!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });

  try {
    const result = await executeHeavyLift(taskData, supabase);
    await completeActivity(taskToken, result);

    return { status: 'completed', output: result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    await failActivity(taskToken, error).catch(() => {
      // Best-effort failure reporting. Activity will time out if this fails.
    });

    return { status: 'failed', error: error.message };
  }
};
