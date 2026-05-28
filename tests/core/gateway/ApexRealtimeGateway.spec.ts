/**
 * Tests for ApexRealtimeGateway (Nexus) — parsing, routing, lifecycle.
 * @date 2026-05-27
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

import {
  buildSessionUpdate,
  cleanup,
  createSafeError,
  generateConnectionId,
  generateIdempotencyKey,
  handleUpgrade,
  hasQueueCapacity,
  isFunctionCallDone,
  parseToolCall,
  routeToolCall,
} from '../../../src/core/gateway/ApexRealtimeGateway';
import { setToolRunner } from '../../../src/core/orchestrator/ApexOrchestrator';
import { _resetForTesting } from '../../../src/core/orchestrator/ChronosLock';
import { setKeyStore, SpectreAuthError, type AegisKeyStore, type AegisKeyRecord } from '../../../src/core/security/SpectreHandshake';
import { TrustTier } from '../../../src/core/types/index';
import type { DeviceProfile } from '../../../src/core/types/index';

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

const validTenant = 't1';
const validSecret = '12345678901234567890123456789012'; // 32 chars
const validAuth = `Bearer ak_live_${validTenant}_${validSecret}`;
const validPrefix = `ak_live_${validTenant}_${validSecret}`.slice(0, 16);

describe('ApexRealtimeGateway', () => {
  let mockStore: AegisKeyStore;
  let mockRecord: AegisKeyRecord;

  beforeEach(() => {
    _resetForTesting();

    // Stub env vars BEFORE each test so that handleUpgrade's lazy env reads
    // see a live Realtime endpoint.  vi.stubEnv auto-restores after each test.
    vi.stubEnv('REALTIME_ENABLED', 'true');
    vi.stubEnv('REALTIME_MODEL_ENDPOINT', 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview');

    setToolRunner(async (name) => ({
      success: true,
      data: [],
      tool: name,
    }));

    mockRecord = {
      keyId: 'key-1',
      tenantId: validTenant,
      keyHash: hashSecret(validSecret),
      trustTier: TrustTier.PERIPHERAL,
      status: 'active',
      environment: 'production',
      audience: [],
    };

    mockStore = {
      lookupKey: vi.fn(async (prefix: string) => {
        if (prefix === validPrefix) return mockRecord;
        return null;
      }),
      updateLastUsed: vi.fn(async () => {}),
    };

    setKeyStore(mockStore);
  });

  describe('generateIdempotencyKey', () => {
    it('produces deterministic key from device + callId', () => {
      const k1 = generateIdempotencyKey('dev-1', 'call-1');
      const k2 = generateIdempotencyKey('dev-1', 'call-1');
      expect(k1).toBe(k2);
      expect(k1).toHaveLength(32);
    });

    it('produces different keys for different inputs', () => {
      const k1 = generateIdempotencyKey('dev-1', 'call-1');
      const k2 = generateIdempotencyKey('dev-1', 'call-2');
      expect(k1).not.toBe(k2);
    });
  });

  describe('generateConnectionId', () => {
    it('returns a UUID format string', () => {
      const id = generateConnectionId();
      expect(id).toMatch(
        /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
      );
    });
  });

  describe('isFunctionCallDone', () => {
    it('returns true for matching event type', () => {
      expect(
        isFunctionCallDone({
          type: 'response.function_call_arguments.done',
        }),
      ).toBe(true);
    });

    it('returns false for other event types', () => {
      expect(
        isFunctionCallDone({ type: 'response.audio.delta' }),
      ).toBe(false);
    });
  });

  describe('parseToolCall', () => {
    it('extracts tool name, args, callId from event', () => {
      const event = {
        type: 'response.function_call_arguments.done',
        name: 'search_database',
        call_id: 'call-42',
        arguments: '{"table":"users"}',
      };
      const parsed = parseToolCall(event, 'dev-1');
      expect(parsed).not.toBeNull();
      expect(parsed?.toolName).toBe('search_database');
      expect(parsed?.callId).toBe('call-42');
      expect(parsed?.args).toEqual({ table: 'users' });
      expect(parsed?.idempotencyKey).toHaveLength(32);
    });

    it('returns null for non-function-call events', () => {
      expect(
        parseToolCall({ type: 'audio.delta' }, 'dev-1'),
      ).toBeNull();
    });

    it('returns null when name or callId missing', () => {
      const event = {
        type: 'response.function_call_arguments.done',
      };
      expect(parseToolCall(event, 'dev-1')).toBeNull();
    });

    it('handles malformed arguments gracefully', () => {
      const event = {
        type: 'response.function_call_arguments.done',
        name: 'search_database',
        call_id: 'call-1',
        arguments: 'not-json',
      };
      const parsed = parseToolCall(event, 'dev-1');
      expect(parsed?.args).toEqual({});
    });
  });

  describe('routeToolCall', () => {
    it('returns item.create and response.create events', async () => {
      const device: DeviceProfile = {
        deviceId: 'key-1',
        trustTier: TrustTier.GOD_MODE,
        capabilities: ['all'],
        connectionId: 'c1',
        authenticatedAt: new Date().toISOString(),
      };

      const toolCall = {
        toolName: 'search_database',
        args: { table: 'profiles' },
        callId: 'call-99',
        idempotencyKey: generateIdempotencyKey(
          'apex-admin',
          'call-99',
        ),
      };

      const events = await routeToolCall(toolCall, device);
      expect(events).toHaveLength(2);

      const item = JSON.parse(events[0]);
      expect(item.type).toBe('conversation.item.create');
      expect(item.item.type).toBe('function_call_output');
      expect(item.item.call_id).toBe('call-99');

      const resp = JSON.parse(events[1]);
      expect(resp.type).toBe('response.create');
    });
  });

  describe('handleUpgrade', () => {
    it('returns connection state on valid auth', async () => {
      const state = await handleUpgrade({
        authorization: validAuth,
      });
      expect(state.device.trustTier).toBe(TrustTier.PERIPHERAL);
      expect(state.connectionId).toBeTruthy();
    });

    it('throws SpectreAuthError on invalid auth', async () => {
      await expect(
        handleUpgrade({
          authorization: 'Bearer wrong',
        })
      ).rejects.toThrow(SpectreAuthError);
    });
  });

  describe('hasQueueCapacity', () => {
    it('returns true when queue is empty', async () => {
      const state = await handleUpgrade({
        authorization: validAuth,
      });
      expect(hasQueueCapacity(state)).toBe(true);
    });
  });

  describe('createSafeError', () => {
    it('produces error payload without stack traces', () => {
      const err = createSafeError('Something failed', 'corr-1');
      expect(err.error).toBe('Something failed');
      expect(err.correlationId).toBe('corr-1');
      expect(err.timestamp).toBeTruthy();
    });
  });

  describe('buildSessionUpdate', () => {
    it('includes filtered tools in session payload', () => {
      const device: DeviceProfile = {
        deviceId: 'key-1',
        trustTier: TrustTier.PERIPHERAL,
        capabilities: ['audio_in', 'audio_out'],
        connectionId: 'c1',
        authenticatedAt: new Date().toISOString(),
      };
      const payload = JSON.parse(
        buildSessionUpdate(device, 'Test prompt'),
      );
      expect(payload.type).toBe('session.update');
      expect(payload.session.tools.length).toBeGreaterThan(0);
      expect(payload.session.instructions).toBe('Test prompt');
    });
  });

  describe('cleanup', () => {
    it('clears timers and queue without error', async () => {
      const state = await handleUpgrade({
        authorization: validAuth,
      });
      state.messageQueue.push('msg1', 'msg2');
      cleanup(state);
      expect(state.messageQueue).toHaveLength(0);
    });
  });
});
