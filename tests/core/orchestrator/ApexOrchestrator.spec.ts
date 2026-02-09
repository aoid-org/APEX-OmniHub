/**
 * Tests for ApexOrchestrator — tool execution with idempotency + validation.
 * @date 2026-02-09
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  executeTool,
  setToolRunner,
} from '../../../src/core/orchestrator/ApexOrchestrator';
import { _resetForTesting } from '../../../src/core/orchestrator/ChronosLock';
import type {
  DeviceProfile,
  ToolExecutionInput,
} from '../../../src/core/types/index';
import { TrustTier } from '../../../src/core/types/index';

function makeDevice(tier: TrustTier): DeviceProfile {
  return {
    deviceId: 'test-device',
    trustTier: tier,
    capabilities: tier === TrustTier.GOD_MODE ? ['all'] : ['read_only'],
    connectionId: 'conn-1',
    authenticatedAt: new Date().toISOString(),
  };
}

function makeInput(
  overrides: Partial<ToolExecutionInput> = {},
): ToolExecutionInput {
  return {
    toolName: 'search_database',
    args: { table: 'profiles' },
    device: makeDevice(TrustTier.GOD_MODE),
    idempotencyKey: `key-${Date.now()}`,
    callId: 'call-1',
    ...overrides,
  };
}

describe('ApexOrchestrator', () => {
  beforeEach(() => {
    _resetForTesting();
    setToolRunner(async (name) => ({
      success: true,
      data: [],
      tool: name,
    }));
  });

  it('executes tool and returns success', async () => {
    const result = await executeTool(makeInput());
    expect(result.success).toBe(true);
    expect(result.callId).toBe('call-1');
  });

  it('rejects access for insufficient tier', async () => {
    const result = await executeTool(
      makeInput({
        toolName: 'delete_record',
        device: makeDevice(TrustTier.PERIPHERAL),
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Access denied');
  });

  it('returns cached result for duplicate idempotency key', async () => {
    const key = 'dedup-key-1';
    const first = await executeTool(
      makeInput({ idempotencyKey: key }),
    );
    expect(first.success).toBe(true);

    const second = await executeTool(
      makeInput({ idempotencyKey: key }),
    );
    expect(second.success).toBe(true);
  });

  it('rolls back on validation failure', async () => {
    setToolRunner(async () => 'not-an-object');

    const result = await executeTool(
      makeInput({ toolName: 'send_email' }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation failed');
  });

  it('rolls back on tool execution error', async () => {
    setToolRunner(async () => {
      throw new Error('Connection refused');
    });

    const result = await executeTool(makeInput());
    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection refused');
  });
});
