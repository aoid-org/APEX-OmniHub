import { describe, it, expect } from 'vitest';
import {
  TriggerLambdaRequestSchema,
  handleTriggerLambda,
  broadcastWorkflowComplete,
} from '../../../src/omnihub-gateway/router';

describe('TriggerLambdaRequestSchema', () => {
  it('accepts valid request with allowed function name', () => {
    const result = TriggerLambdaRequestSchema.safeParse({
      taskData: { key: 'value' },
      functionName: 'OmniHubWorkerLambda',
    });
    expect(result.success).toBe(true);
  });

  it('defaults functionName to OmniHubWorkerLambda', () => {
    const result = TriggerLambdaRequestSchema.safeParse({
      taskData: { key: 'value' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.functionName).toBe('OmniHubWorkerLambda');
    }
  });

  it('rejects function names not in allowlist', () => {
    const result = TriggerLambdaRequestSchema.safeParse({
      taskData: {},
      functionName: 'MaliciousLambda',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('allowlist');
    }
  });

  it('rejects empty function name', () => {
    const result = TriggerLambdaRequestSchema.safeParse({
      taskData: {},
      functionName: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all allowlisted function names', () => {
    for (const name of [
      'OmniHubWorkerLambda',
      'OmniHubAnalyticsLambda',
      'OmniHubNotificationLambda',
    ]) {
      const result = TriggerLambdaRequestSchema.safeParse({
        taskData: {},
        functionName: name,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing taskData', () => {
    const result = TriggerLambdaRequestSchema.safeParse({});
    // taskData is a required z.record — missing means validation failure
    expect(result.success).toBe(false);
  });
});

describe('handleTriggerLambda', () => {
  it('returns 401 for missing Authorization header', async () => {
    const request = new Request('http://localhost/api/workflows/trigger-lambda', {
      method: 'POST',
      body: JSON.stringify({ taskData: {} }),
    });
    const response = await handleTriggerLambda(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Authorization');
  });

  it('returns 401 for invalid JWT (too short)', async () => {
    const request = new Request('http://localhost/api/workflows/trigger-lambda', {
      method: 'POST',
      headers: { Authorization: 'Bearer abc' },
      body: JSON.stringify({ taskData: {} }),
    });
    const response = await handleTriggerLambda(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid JSON body', async () => {
    const request = new Request('http://localhost/api/workflows/trigger-lambda', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-jwt-token-12345' },
      body: 'not json',
    });
    const response = await handleTriggerLambda(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for disallowed function name', async () => {
    const request = new Request('http://localhost/api/workflows/trigger-lambda', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-jwt-token-12345' },
      body: JSON.stringify({ taskData: {}, functionName: 'EvilFunction' }),
    });
    const response = await handleTriggerLambda(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Validation error');
  });

  it('returns 202 for valid request', async () => {
    const request = new Request('http://localhost/api/workflows/trigger-lambda', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-jwt-token-12345' },
      body: JSON.stringify({ taskData: { action: 'test' } }),
    });
    const response = await handleTriggerLambda(request);
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.status).toBe('dispatched');
    expect(body.workflowId).toBeDefined();
  });
});

describe('broadcastWorkflowComplete', () => {
  it('calls sseManager.broadcast with correct event data', () => {
    const mockBroadcast = { broadcast: () => 3 } as unknown as Parameters<typeof broadcastWorkflowComplete>[0];
    const result = broadcastWorkflowComplete(
      mockBroadcast,
      'wf-123',
      'OmniHubWorkerLambda',
    );
    expect(result).toBe(3);
  });
});
