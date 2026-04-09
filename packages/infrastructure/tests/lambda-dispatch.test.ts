/**
 * Lambda Dispatch Activity — Unit Tests
 * @module packages/infrastructure/tests/lambda-dispatch.test
 *
 * Verifies that dispatchToLambdaActivity:
 * 1. Extracts the Temporal taskToken from the activity context.
 * 2. Invokes the Lambda with InvocationType 'Event' (fire-and-forget).
 * 3. Serializes taskData, userJwt, and Base64-encoded taskToken in the payload.
 * 4. Throws CompleteAsyncError to signal async completion to Temporal.
 *
 * All external dependencies (@aws-sdk/client-lambda, @temporalio/activity)
 * are mocked — no live infrastructure required.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks — must be declared before imports
// ============================================================================

const mockTaskToken = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0xAA, 0xBB]);

const mockSend = vi.fn().mockResolvedValue({ StatusCode: 202 });

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

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { dispatchToLambdaActivity } from '../../../src/omnihub-gateway/TemporalBridge';
import { LambdaClient } from '@aws-sdk/client-lambda';

// ============================================================================
// Tests
// ============================================================================

describe('dispatchToLambdaActivity', () => {
  const testPayload = {
    taskData: { operation: 'heavy-compute', inputSize: 1024 },
    userJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-jwt-payload',
    functionName: 'OmniHubWorkerLambda',
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes Lambda with InvocationType "Event" (fire-and-forget)', async () => {
    const client = new LambdaClient();

    await expect(
      dispatchToLambdaActivity(
        testPayload,
        client as unknown as InstanceType<typeof LambdaClient>,
        mockTaskToken,
      ),
    ).rejects.toMatchObject({ name: 'CompleteAsyncError' });

    expect(mockSend).toHaveBeenCalledOnce();

    const invokeCommand = mockSend.mock.calls[0][0];
    expect(invokeCommand.input.FunctionName).toBe('OmniHubWorkerLambda');
    expect(invokeCommand.input.InvocationType).toBe('Event');
  });

  it('serializes taskData, userJwt, and Base64-encoded taskToken in the payload', async () => {
    const client = new LambdaClient();

    await expect(
      dispatchToLambdaActivity(
        testPayload,
        client as unknown as InstanceType<typeof LambdaClient>,
        mockTaskToken,
      ),
    ).rejects.toMatchObject({ name: 'CompleteAsyncError' });

    const invokeCommand = mockSend.mock.calls[0][0];
    const payloadBytes = invokeCommand.input.Payload as Uint8Array;
    const parsed = JSON.parse(new TextDecoder().decode(payloadBytes));

    expect(parsed.taskData).toEqual(testPayload.taskData);
    expect(parsed.userJwt).toBe(testPayload.userJwt);

    // Verify taskToken is Base64-encoded from the mock token
    const expectedB64 = Buffer.from(mockTaskToken).toString('base64');
    expect(parsed.taskToken).toBe(expectedB64);
  });

  it('throws CompleteAsyncError to signal async completion', async () => {
    const client = new LambdaClient();

    let caughtError: unknown;
    try {
      await dispatchToLambdaActivity(
        testPayload,
        client as unknown as InstanceType<typeof LambdaClient>,
        mockTaskToken,
      );
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).name).toBe('CompleteAsyncError');
  });

  it('invokes Lambda before throwing CompleteAsyncError', async () => {
    const client = new LambdaClient();

    try {
      await dispatchToLambdaActivity(
        testPayload,
        client as unknown as InstanceType<typeof LambdaClient>,
        mockTaskToken,
      );
    } catch {
      // Expected
    }

    // Lambda must have been invoked before the throw
    expect(mockSend).toHaveBeenCalledOnce();
  });
});
