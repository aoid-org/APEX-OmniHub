/**
 * Regression shield: invoke.ts DB contract.
 *
 * These tests guard against re-introducing columns/values that violate the
 * canonical agent_runs migration schema (20251221000001_omnilink_ops_pack.sql).
 *
 * Mix of static source analysis (patterns 1-3) and unit tests (pattern 4).
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const INVOKE_PATH = path.resolve(process.cwd(), 'functions/api/mcp/invoke.ts');
const INVOKE_SRC = fs.readFileSync(INVOKE_PATH, 'utf8');

describe('invoke.ts agent_runs insert schema', () => {
  it('does not insert "query" field — migration has no query column', () => {
    const agentRunsIdx = INVOKE_SRC.indexOf('/rest/v1/agent_runs');
    expect(agentRunsIdx).toBeGreaterThan(-1);
    // Inspect the insert body (up to 800 chars after the URL)
    const insertWindow = INVOKE_SRC.slice(agentRunsIdx, agentRunsIdx + 800);
    // "query" must not appear as a JSON key in the insert body
    expect(insertWindow).not.toMatch(/['"]\s*query\s*['"]\s*:/);
  });

  it('does not write "queued" to DB — CHECK constraint forbids it', () => {
    const agentRunsIdx = INVOKE_SRC.indexOf('/rest/v1/agent_runs');
    const insertWindow = INVOKE_SRC.slice(agentRunsIdx, agentRunsIdx + 800);
    // "queued" must not be used as the status value in the DB insert
    expect(insertWindow).not.toMatch(/status\s*:\s*['"]queued['"]/);
    // Must use "running" (which the CHECK constraint permits)
    expect(insertWindow).toMatch(/status\s*:\s*['"]running['"]/);
  });

  it('insert body includes migration-defined columns: thread_id and user_message', () => {
    const agentRunsIdx = INVOKE_SRC.indexOf('/rest/v1/agent_runs');
    const insertWindow = INVOKE_SRC.slice(agentRunsIdx, agentRunsIdx + 800);
    expect(insertWindow).toMatch(/thread_id/);
    expect(insertWindow).toMatch(/user_message/);
  });
});

describe('invoke.ts insertRes null guard', () => {
  it('handles insertRes === null as terminal failure before apex-agent fetch', () => {
    // insertRes === null guard must appear before the apex-agent URL
    const nullGuardIdx = INVOKE_SRC.indexOf('insertRes === null');
    const apexAgentIdx = INVOKE_SRC.indexOf('functions/v1/apex-agent');
    expect(nullGuardIdx).toBeGreaterThan(-1);
    expect(apexAgentIdx).toBeGreaterThan(-1);
    expect(nullGuardIdx).toBeLessThan(apexAgentIdx);
  });

  it('emits agent_run_insert_failed on null insertRes', () => {
    // The null guard must emit agent_run_insert_failed (not a different error code)
    const nullGuardIdx = INVOKE_SRC.indexOf('insertRes === null');
    const apexAgentIdx = INVOKE_SRC.indexOf('functions/v1/apex-agent');
    const nullBlock = INVOKE_SRC.slice(nullGuardIdx, apexAgentIdx);
    expect(nullBlock).toMatch(/agent_run_insert_failed/);
  });
});

describe('invoke.ts poll select columns', () => {
  it('does not select banned columns: reply, result, error, workflow_id, completed_at', () => {
    const pollIdx = INVOKE_SRC.indexOf('agent_runs?id=eq');
    expect(pollIdx).toBeGreaterThan(-1);
    const pollWindow = INVOKE_SRC.slice(pollIdx, pollIdx + 300);

    // Extract the select parameter value
    const selectMatch = pollWindow.match(/select=([^`"&\s\n\\]+)/);
    expect(selectMatch).toBeTruthy();

    const cols = (selectMatch![1] ?? '').split(',');
    const banned = ['reply', 'result', 'error', 'workflow_id', 'completed_at'];
    for (const col of banned) {
      expect(cols, `poll must not select column "${col}"`).not.toContain(col);
    }
  });

  it('selects migration-defined columns: agent_response, error_message, end_time', () => {
    const pollIdx = INVOKE_SRC.indexOf('agent_runs?id=eq');
    const pollWindow = INVOKE_SRC.slice(pollIdx, pollIdx + 300);
    const selectMatch = pollWindow.match(/select=([^`"&\s\n\\]+)/);
    const cols = (selectMatch![1] ?? '').split(',');
    expect(cols).toContain('agent_response');
    expect(cols).toContain('error_message');
    expect(cols).toContain('end_time');
  });
});

describe('buildReplyFromAgentResponse', () => {
  it('returns non-empty reply for completed JSON agent_response', async () => {
    // Dynamic import so the module is fresh (no Worker globals needed for this export)
    const mod = await import('../../functions/api/mcp/invoke.ts');
    const agentRespJson = '{"status":"success","goal":"hello","steps_executed":1}';
    const reply = mod.buildReplyFromAgentResponse(agentRespJson, 'hello');

    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(0);
    expect(reply).toContain('hello');
  });

  it('falls back to prompt-based message when agent_response lacks text fields', async () => {
    const mod = await import('../../functions/api/mcp/invoke.ts');
    const reply = mod.buildReplyFromAgentResponse(null, 'my test prompt');
    expect(reply).toContain('my test prompt');
  });

  it('returns reply field if present in JSON', async () => {
    const mod = await import('../../functions/api/mcp/invoke.ts');
    const json = JSON.stringify({ status: 'success', reply: 'All done!', goal: 'ignored' });
    const result = mod.buildReplyFromAgentResponse(json, 'prompt');
    expect(result).toBe('All done!');
  });

  it('returns plain string agent_response as-is when short', async () => {
    const mod = await import('../../functions/api/mcp/invoke.ts');
    const result = mod.buildReplyFromAgentResponse('Task complete', 'prompt');
    expect(result).toBe('Task complete');
  });
});
