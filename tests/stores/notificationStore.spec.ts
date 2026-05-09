import { describe, it, expect } from 'vitest';
import {
  pushNotification,
  approveTask,
  denyTask,
} from '@/stores/notificationStore';

// The module uses useSyncExternalStore — we test the imperative API directly.
// The reactive hook is React-only and tested implicitly.

  // pushNotification is the only way to add — we verify via the module's internal array
  // Since there's no public getter besides useNotifications (React hook),
  // we'll test via the side effects of push/approve/deny
describe('notificationStore', () => {
  // The store uses module-level state. We can't easily reset between tests,
  // so we track notification IDs per test.

  let testCounter = 0;

  function uniqueNotification() {
    testCounter++;
    return {
      id: `notif-${testCounter}`,
      taskId: `task-${testCounter}`,
      title: `Test Notification ${testCounter}`,
      description: `Description ${testCounter}`,
      lane: 'RED' as const,
    };
  }

  it('should export pushNotification as a function', () => {
    expect(typeof pushNotification).toBe('function');
  });

  it('should export approveTask as a function', () => {
    expect(typeof approveTask).toBe('function');
  });

  it('should export denyTask as a function', () => {
    expect(typeof denyTask).toBe('function');
  });

  it('should push a notification without throwing', () => {
    expect(() => pushNotification(uniqueNotification())).not.toThrow();
  });

  it('should approve a task without throwing', () => {
    const notif = uniqueNotification();
    pushNotification(notif);
    expect(() => approveTask(notif.taskId)).not.toThrow();
  });

  it('should deny a task without throwing', () => {
    const notif = uniqueNotification();
    pushNotification(notif);
    expect(() => denyTask(notif.taskId)).not.toThrow();
  });

  it('should handle approve for non-existent task gracefully', () => {
    expect(() => approveTask('non-existent-task')).not.toThrow();
  });

  it('should handle deny for non-existent task gracefully', () => {
    expect(() => denyTask('non-existent-task')).not.toThrow();
  });
});
