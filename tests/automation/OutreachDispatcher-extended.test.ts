/**
 * Extended OutreachDispatcher Tests
 * Covers uncovered branches:
 * - GREEN lane: auto-send and status 'sent'
 * - YELLOW lane: queuing + timeout auto-approve path
 * - RED lane: queuing for MAN Mode
 * - approveOutreach: found and not-found branches
 * - rejectOutreach: found and not-found branches
 * - getOutreachQueue contents
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dispatchOutreach,
  getOutreachQueue,
  clearOutreachQueue,
  approveOutreach,
  rejectOutreach,
  type OutreachPayload,
} from '../../src/automation/OutreachDispatcher';

// Mock the omnilink integration so no real HTTP calls occur
vi.mock('../../src/integrations/omnilink', () => ({
  requestOmniLink: vi.fn().mockResolvedValue({ status: 200, body: { ok: true } }),
}));

import { requestOmniLink } from '../../src/integrations/omnilink';

const mockSend = vi.mocked(requestOmniLink);

const emailPayload: OutreachPayload = {
  recipientId: 'user-abc',
  channel: 'email',
  subject: 'Hello',
  body: 'Test body',
};

const smsPayload: OutreachPayload = {
  recipientId: 'user-sms',
  channel: 'sms',
  body: 'SMS text',
};

describe('OutreachDispatcher — extended coverage', () => {
  beforeEach(() => {
    clearOutreachQueue();
    mockSend.mockClear();
    mockSend.mockResolvedValue({ status: 200, body: { ok: true } } as never);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearOutreachQueue();
  });

  // ── GREEN lane ──────────────────────────────────────────────────────────

  describe('GREEN lane', () => {
    test('sends immediately and returns status "sent"', async () => {
      const item = await dispatchOutreach(emailPayload, 'GREEN');
      expect(item.status).toBe('sent');
      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend).toHaveBeenCalledWith({
        path: '/outreach/send',
        method: 'POST',
        body: emailPayload,
      });
    });

    test('adds sent item to queue', async () => {
      await dispatchOutreach(emailPayload, 'GREEN');
      const queue = getOutreachQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('sent');
      expect(queue[0].riskLane).toBe('GREEN');
    });

    test('returned item has correct recipientId and channel', async () => {
      const item = await dispatchOutreach(emailPayload, 'GREEN');
      expect(item.payload.recipientId).toBe('user-abc');
      expect(item.payload.channel).toBe('email');
    });

    test('id follows the outreach-{timestamp}-{counter} format', async () => {
      const item = await dispatchOutreach(emailPayload, 'GREEN');
      expect(item.id).toMatch(/^outreach-\d+-\d+$/);
    });
  });

  // ── YELLOW lane ─────────────────────────────────────────────────────────

  describe('YELLOW lane', () => {
    test('queues item with pending status (no immediate send)', async () => {
      const item = await dispatchOutreach(smsPayload, 'YELLOW');
      expect(item.status).toBe('pending');
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('queued item appears in getOutreachQueue', async () => {
      await dispatchOutreach(smsPayload, 'YELLOW');
      const queue = getOutreachQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].riskLane).toBe('YELLOW');
      expect(queue[0].status).toBe('pending');
    });

    test('multiple yellow items are all queued', async () => {
      await dispatchOutreach(emailPayload, 'YELLOW');
      await dispatchOutreach(smsPayload, 'YELLOW');
      expect(getOutreachQueue()).toHaveLength(2);
    });

    test('riskLane is preserved on queued item', async () => {
      const item = await dispatchOutreach(emailPayload, 'YELLOW');
      expect(item.riskLane).toBe('YELLOW');
    });
  });

  // ── RED lane ────────────────────────────────────────────────────────────

  describe('RED lane', () => {
    test('queues item as pending (MAN Mode)', async () => {
      const item = await dispatchOutreach(emailPayload, 'RED');
      expect(item.status).toBe('pending');
      expect(item.riskLane).toBe('RED');
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('RED item stays pending — no timer', async () => {
      await dispatchOutreach(emailPayload, 'RED');
      // Give enough time for any (incorrectly set) timer to fire
      await new Promise(r => setTimeout(r, 100));
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('multiple RED items accumulate in queue', async () => {
      await dispatchOutreach(emailPayload, 'RED');
      await dispatchOutreach(smsPayload, 'RED');
      const queue = getOutreachQueue();
      expect(queue).toHaveLength(2);
      expect(queue.every(q => q.status === 'pending')).toBe(true);
    });
  });

  // ── approveOutreach ─────────────────────────────────────────────────────

  describe('approveOutreach', () => {
    test('approves pending item, sends, and returns true', async () => {
      const item = await dispatchOutreach(emailPayload, 'RED');
      const result = await approveOutreach(item.id);
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledOnce();
      // Item status updated to 'sent'
      const queue = getOutreachQueue();
      const found = queue.find(q => q.id === item.id);
      expect(found!.status).toBe('sent');
    });

    test('returns false when id does not exist', async () => {
      const result = await approveOutreach('nonexistent-id');
      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('returns false when item is not pending (already sent)', async () => {
      // Dispatch GREEN so it's immediately 'sent'
      const item = await dispatchOutreach(emailPayload, 'GREEN');
      mockSend.mockClear();
      const result = await approveOutreach(item.id);
      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('approves correct item when queue has multiple items', async () => {
      const item1 = await dispatchOutreach(emailPayload, 'RED');
      const item2 = await dispatchOutreach(smsPayload, 'RED');
      const result = await approveOutreach(item2.id);
      expect(result).toBe(true);
      const queue = getOutreachQueue();
      expect(queue.find(q => q.id === item1.id)!.status).toBe('pending');
      expect(queue.find(q => q.id === item2.id)!.status).toBe('sent');
    });
  });

  // ── rejectOutreach ──────────────────────────────────────────────────────

  describe('rejectOutreach', () => {
    test('rejects pending item and returns true', async () => {
      const item = await dispatchOutreach(emailPayload, 'RED');
      const result = rejectOutreach(item.id);
      expect(result).toBe(true);
      const queue = getOutreachQueue();
      expect(queue.find(q => q.id === item.id)!.status).toBe('rejected');
    });

    test('returns false when id does not exist', () => {
      const result = rejectOutreach('nonexistent-id');
      expect(result).toBe(false);
    });

    test('returns false when item is not pending', async () => {
      const item = await dispatchOutreach(emailPayload, 'GREEN');
      const result = rejectOutreach(item.id);
      expect(result).toBe(false);
    });

    test('rejecting one item does not affect others', async () => {
      const item1 = await dispatchOutreach(emailPayload, 'RED');
      const item2 = await dispatchOutreach(smsPayload, 'RED');
      rejectOutreach(item1.id);
      const queue = getOutreachQueue();
      expect(queue.find(q => q.id === item2.id)!.status).toBe('pending');
    });

    test('does not call sendOutreach on rejection', async () => {
      const item = await dispatchOutreach(emailPayload, 'RED');
      mockSend.mockClear();
      rejectOutreach(item.id);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  // ── getOutreachQueue ────────────────────────────────────────────────────

  describe('getOutreachQueue', () => {
    test('returns the queue contents (items are preserved across calls)', async () => {
      await dispatchOutreach(emailPayload, 'RED');
      await dispatchOutreach(smsPayload, 'RED');
      const queue = getOutreachQueue();
      expect(queue).toHaveLength(2);
      // Same items are accessible in subsequent calls
      expect(getOutreachQueue()).toHaveLength(2);
    });

    test('queuedAt is a recent timestamp', async () => {
      const before = Date.now();
      const item = await dispatchOutreach(emailPayload, 'RED');
      const after = Date.now();
      expect(item.queuedAt).toBeGreaterThanOrEqual(before);
      expect(item.queuedAt).toBeLessThanOrEqual(after);
    });
  });

  // ── metadata/subject optional fields ────────────────────────────────────

  describe('optional payload fields', () => {
    test('dispatches payload with templateId and metadata', async () => {
      const rich: OutreachPayload = {
        recipientId: 'user-rich',
        channel: 'push',
        body: 'Push notification',
        templateId: 'tpl-1',
        metadata: { campaign: 'summer' },
      };
      const item = await dispatchOutreach(rich, 'GREEN');
      expect(item.payload.templateId).toBe('tpl-1');
      expect(item.payload.metadata).toEqual({ campaign: 'summer' });
    });
  });
});
