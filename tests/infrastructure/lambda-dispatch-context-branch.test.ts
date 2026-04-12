import { describe, expect, it, vi } from 'vitest';

const contextTaskToken = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
const mockSend = vi.fn().mockResolvedValue({ StatusCode: 202 });

vi.mock('@temporalio/activity', () => {
  class CompleteAsyncError extends Error {
    readonly name = 'CompleteAsyncError';
    constructor() {
      super('Activity will be completed asynchronously');
    }
  }

  return {
    Context: {
      current: () => ({ info: { taskToken: contextTaskToken } }),
    },
    CompleteAsyncError,
  };
});

vi.mock('@aws-sdk/client-lambda', () => {
  class LambdaClient {
    send = mockSend;
  }

  class InvokeCommand {
    readonly input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }

  return { LambdaClient, InvokeCommand };
});

import { dispatchToLambdaActivity } from '@/omnihub-gateway/lambdaDispatchActivity';
import { LambdaClient } from '@aws-sdk/client-lambda';

describe('dispatchToLambdaActivity (context token branch)', () => {
  it('uses Temporal Context.current().info.taskToken when override is omitted', async () => {
    const client = new LambdaClient();

    await expect(
      dispatchToLambdaActivity(
        {
          taskData: { op: 'context-branch' },
          userJwt: 'jwt',
          functionName: 'OmniHubWorkerLambda',
        },
        client as unknown as InstanceType<typeof LambdaClient>,
      ),
    ).rejects.toMatchObject({ name: 'CompleteAsyncError' });

    const invokeCommand = mockSend.mock.calls[0][0];
    const payload = JSON.parse(new TextDecoder().decode(invokeCommand.input.Payload as Uint8Array));
    expect(payload.taskToken).toBe(Buffer.from(contextTaskToken).toString('base64'));
  });
});
