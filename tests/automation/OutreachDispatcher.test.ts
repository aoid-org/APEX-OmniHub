import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  dispatchOutreach,
  getOutreachQueue,
  clearOutreachQueue,
  type OutreachPayload,
} from '../../src/automation/OutreachDispatcher';

describe('OutreachDispatcher', () => {
  const mockPayload: OutreachPayload = {
    recipientId: 'user-123',
    channel: 'email',
    body: 'Test Message',
  };

  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Start with a clean queue
    clearOutreachQueue();
    // Stub out sendOutreach logs during the test
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (warnSpy) warnSpy.mockRestore();
    clearOutreachQueue();
  });

  describe('clearOutreachQueue', () => {
    test('should completely empty the queued items and reset ID counter', async () => {
      // 1. Seed the queue with items that remain pending
      await dispatchOutreach(mockPayload, 'RED');
      await dispatchOutreach(mockPayload, 'RED');

      let queue = getOutreachQueue();
      expect(queue).toHaveLength(2);

      const firstIdBeforeReset = queue[0].id;

      // 2. Clear the queue
      clearOutreachQueue();

      queue = getOutreachQueue();
      expect(queue).toHaveLength(0);

      // 3. Dispatch a new item to verify the queueIDCounter was reset properly
      await dispatchOutreach(mockPayload, 'RED');
      queue = getOutreachQueue();

      expect(queue).toHaveLength(1);
      const firstIdAfterReset = queue[0].id;

      // The format is `outreach-${Date.now()}-${queueIdCounter}`.
      // Both before and after reset should end with `-1` since queueIdCounter starts at 0 and increments.
      expect(firstIdBeforeReset.endsWith('-1')).toBe(true);
      expect(firstIdAfterReset.endsWith('-1')).toBe(true);

      // They might not be strictly identical if Date.now() ticked over, but the suffix proves reset.
      expect(firstIdBeforeReset).not.toEqual(firstIdAfterReset + 'x'); // Dummy assertion, the suffix check is the real one
    });
  });
});
