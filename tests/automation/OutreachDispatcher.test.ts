import { describe, test, expect, beforeEach, spyOn, afterEach } from 'bun:test';
import {
  dispatchOutreach,
  getOutreachQueue,
  approveOutreach,
  rejectOutreach,
  clearOutreachQueue,
  type OutreachPayload,
} from '../../src/automation/OutreachDispatcher';

describe('OutreachDispatcher', () => {
  const mockPayload: OutreachPayload = {
    recipientId: 'user-123',
    channel: 'email',
    body: 'Test Message',
  };

  beforeEach(() => {
    clearOutreachQueue();
    spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cannot restoreAllMocks as cleanly without vi, but we can restore specific spies
    (console.warn as any).mockRestore?.();
  });

  describe('dispatchOutreach', () => {
    test('GREEN lane should send immediately and mark as sent', async () => {
      const item = await dispatchOutreach(mockPayload, 'GREEN');
      expect(item.status).toBe('sent');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[OutreachDispatcher] SENT:'),
        expect.objectContaining({ recipientId: 'user-123' })
      );

      const queue = getOutreachQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('sent');
    });

    test('YELLOW lane should queue and wait (we mock setTimeout to test logic)', async () => {
      // Safely mock global setTimeout just for this test
      const originalSetTimeout = global.setTimeout;
      const setTimeoutSpy = spyOn(global, 'setTimeout').mockImplementation((cb: Function) => {
        // Execute immediately to verify logic
        cb();
        return 1 as any;
      });

      const item = await dispatchOutreach(mockPayload, 'YELLOW');

      // Wait a microtask
      await Promise.resolve();
      await Promise.resolve();

      const queue = getOutreachQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('sent');
      expect(console.warn).toHaveBeenCalled();

      // Restore
      setTimeoutSpy.mockRestore();
    });

    test('RED lane should queue and wait for manual approval', async () => {
      const item = await dispatchOutreach(mockPayload, 'RED');
      expect(item.status).toBe('pending');

      const queue = getOutreachQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('pending');
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('Manual Approval/Rejection', () => {
    test('approveOutreach should send and mark as sent', async () => {
      const item = await dispatchOutreach(mockPayload, 'RED');
      expect(item.status).toBe('pending');

      const approved = await approveOutreach(item.id);
      expect(approved).toBeTrue();

      const queue = getOutreachQueue();
      expect(queue[0].status).toBe('sent');
      expect(console.warn).toHaveBeenCalled();
    });

    test('rejectOutreach should mark as rejected and not send', async () => {
      const item = await dispatchOutreach(mockPayload, 'RED');
      expect(item.status).toBe('pending');

      const rejected = rejectOutreach(item.id);
      expect(rejected).toBeTrue();

      const queue = getOutreachQueue();
      expect(queue[0].status).toBe('rejected');
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('approveOutreach should return false for non-existent or non-pending item', async () => {
      const result = await approveOutreach('invalid-id');
      expect(result).toBeFalse();

      const item = await dispatchOutreach(mockPayload, 'GREEN'); // Status becomes 'sent'
      const result2 = await approveOutreach(item.id);
      expect(result2).toBeFalse();
    });
  });

  describe('clearOutreachQueue', () => {
    test('should empty the queue and reset the id counter', async () => {
      // Seed the queue
      await dispatchOutreach(mockPayload, 'RED');
      await dispatchOutreach(mockPayload, 'RED');

      let queue = getOutreachQueue();
      expect(queue).toHaveLength(2);

      // Clear the queue
      clearOutreachQueue();

      queue = getOutreachQueue();
      expect(queue).toHaveLength(0);

      // Dispatch a new item to check the counter was reset to 1
      const newItem = await dispatchOutreach(mockPayload, 'RED');
      const newMatch = newItem.id.match(/outreach-\d+-(\d+)/);
      const newCounter = newMatch ? parseInt(newMatch[1], 10) : -1;

      expect(newCounter).toBe(1);
    });
  });
});
