import { describe, expect, it, vi } from 'vitest';
import {
  signCommand,
  dispatchCommand,
  type OutboundCommand,
} from '../../../src/lib/omnibridge/outboundCaller';

const SECRET = 'apex-control-test-secret-a1b2c3';

function buildCommand(overrides: Partial<OutboundCommand> = {}): OutboundCommand {
  return {
    command_id: 'cmd_abc',
    action: 'broadcast_message',
    target_source: 'sbbl-hq',
    target_entity_id: null,
    reason: 'operator-initiated test',
    issued_at: new Date().toISOString(),
    issued_by: 'user-1',
    payload: { message: 'hello' },
    ...overrides,
  };
}

describe('signCommand', () => {
  it('produces deterministic signatures for identical inputs', async () => {
    const cmd = buildCommand();
    const a = await signCommand(cmd, SECRET);
    const b = await signCommand(cmd, SECRET);
    expect(a).toBe(b);
  });

  it('produces different signatures for different secrets', async () => {
    const cmd = buildCommand();
    const a = await signCommand(cmd, SECRET);
    const b = await signCommand(cmd, 'different-secret');
    expect(a).not.toBe(b);
  });

  it('produces different signatures when payload changes', async () => {
    const a = await signCommand(buildCommand({ payload: { x: 1 } }), SECRET);
    const b = await signCommand(buildCommand({ payload: { x: 2 } }), SECRET);
    expect(a).not.toBe(b);
  });

  it('uses base64url encoding (no +, /, =)', async () => {
    const sig = await signCommand(buildCommand(), SECRET);
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('dispatchCommand', () => {
  it('fails closed on missing target URL', async () => {
    const result = await dispatchCommand({
      targetUrl: '',
      secret: SECRET,
      command: buildCommand(),
      fetchImpl: vi.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_target_url');
  });

  it('fails closed on missing secret', async () => {
    const result = await dispatchCommand({
      targetUrl: 'https://example.com/hook',
      secret: '',
      command: buildCommand(),
      fetchImpl: vi.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_secret');
  });

  it('succeeds on 2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ acknowledged: true }), { status: 200 }),
    );
    const result = await dispatchCommand({
      targetUrl: 'https://example.com/hook',
      secret: SECRET,
      command: buildCommand(),
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    expect(result.http_status).toBe(200);
    expect(result.attempts).toBe(1);
  });

  it('does not retry on 4xx responses (permanent failures)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad_signature' }), { status: 401 }),
    );
    const result = await dispatchCommand({
      targetUrl: 'https://example.com/hook',
      secret: SECRET,
      command: buildCommand(),
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(result.http_status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx responses up to MAX_ATTEMPTS', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('', { status: 503 }),
    );
    const result = await dispatchCommand({
      targetUrl: 'https://example.com/hook',
      secret: SECRET,
      command: buildCommand(),
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  }, 20_000);

  it('sends correct signature header', async () => {
    let captured: RequestInit | null = null;
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      captured = init;
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    const cmd = buildCommand();
    const expectedSig = await signCommand(cmd, SECRET);
    await dispatchCommand({
      targetUrl: 'https://example.com/hook',
      secret: SECRET,
      command: cmd,
      fetchImpl,
    });
    const headers = captured!.headers as Record<string, string>;
    expect(headers['X-Omni-Signature']).toBe(expectedSig);
    expect(headers['X-Omni-Command-Id']).toBe(cmd.command_id);
    expect(headers['X-Omni-Action']).toBe(cmd.action);
  });
});
