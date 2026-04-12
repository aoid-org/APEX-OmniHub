import { Context, CompleteAsyncError } from '@temporalio/activity';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export interface LambdaDispatchPayload {
  readonly taskData: Record<string, unknown>;
  readonly userJwt: string;
  readonly functionName: string;
}

export interface LambdaDispatchResult {
  readonly dispatched: boolean;
  readonly taskToken: string;
}

/**
 * Temporal Activity helper: dispatch to Lambda and signal async completion.
 */
export async function dispatchToLambdaActivity(
  payload: LambdaDispatchPayload,
  lambdaClient?: InstanceType<typeof LambdaClient>,
  taskTokenOverride?: Uint8Array,
): Promise<never> {
  // Tests may inject a deterministic token; production uses Temporal activity context.
  const taskToken = taskTokenOverride ?? Context.current().info.taskToken;
  const taskTokenB64 = Buffer.from(taskToken).toString('base64');

  const client = lambdaClient ?? new LambdaClient({});
  const invokePayload = JSON.stringify({
    taskData: payload.taskData,
    userJwt: payload.userJwt,
    taskToken: taskTokenB64,
  });

  await client.send(
    new InvokeCommand({
      FunctionName: payload.functionName,
      InvocationType: 'Event',
      Payload: new TextEncoder().encode(invokePayload),
    }),
  );

  throw new CompleteAsyncError();
}
