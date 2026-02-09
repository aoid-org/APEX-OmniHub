/**
 * ApexOrchestrator — Tool execution coordinator with
 * idempotency (ChronosLock) and validation (Veritas).
 *
 * Receives tool-call requests from the Nexus gateway,
 * enforces idempotency, executes the tool, validates the
 * result, and commits or rolls back.
 *
 * @module core/orchestrator/ApexOrchestrator
 * @version 1.0.0
 * @date 2026-02-09
 */

import { validateAccess } from '../security/AegisKernel';
import type {
  ToolExecutionInput,
  ToolExecutionResult,
} from '../types/index';
import * as ChronosLock from './ChronosLock';
import * as Veritas from './Veritas';

/* ------------------------------------------------------------------ */
/*  Stub tool runner (delegates to backend orchestrator in production) */
/* ------------------------------------------------------------------ */

type ToolRunner = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

let _toolRunner: ToolRunner = defaultToolRunner;

async function defaultToolRunner(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return {
    success: true,
    tool: toolName,
    echo: args,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Override the default tool runner (for tests or DI).
 */
export function setToolRunner(runner: ToolRunner): void {
  _toolRunner = runner;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Execute a tool call with full idempotency and validation.
 *
 * Flow:
 * 1. Aegis access check
 * 2. ChronosLock.acquire — reject duplicates
 * 3. Run tool
 * 4. Veritas.validate — check output
 * 5. ChronosLock.commit (or rollback on validation failure)
 */
export async function executeTool(
  input: ToolExecutionInput,
): Promise<ToolExecutionResult> {
  const { toolName, args, device, idempotencyKey, callId } =
    input;

  // 1. Aegis guard
  if (!validateAccess(toolName, device)) {
    return {
      success: false,
      callId,
      output: null,
      error: 'Access denied for this device tier',
    };
  }

  // 2. Idempotency check
  const lock = ChronosLock.acquire(idempotencyKey);
  if (!lock.isNew) {
    return {
      success: true,
      callId,
      output: lock.record.result ?? null,
      error: undefined,
    };
  }

  // 3. Execute tool
  let rawResult: unknown;
  try {
    rawResult = await _toolRunner(toolName, args);
  } catch (err: unknown) {
    ChronosLock.rollback(idempotencyKey);
    const msg =
      err instanceof Error ? err.message : 'Tool execution failed';
    return { success: false, callId, output: null, error: msg };
  }

  // 4. Validate output
  const validation = Veritas.validate(toolName, rawResult);
  if (!validation.valid) {
    ChronosLock.rollback(idempotencyKey);
    return {
      success: false,
      callId,
      output: null,
      error: `Validation failed: ${validation.reason}`,
    };
  }

  // 5. Commit
  ChronosLock.commit(idempotencyKey, rawResult);

  return { success: true, callId, output: rawResult };
}
