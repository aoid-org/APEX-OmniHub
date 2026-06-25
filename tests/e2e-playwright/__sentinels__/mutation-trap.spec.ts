import { test, expect } from '@playwright/test';

// APEX Test Integrity Doctrine (R3)
// This sentinel file is an intentional trap.
// It is explicitly executed by a separate CI job to prove the test runner
// is capable of failing when assertions fail. If this test passes or is
// skipped, the mutation-trap CI job will fail the build.
test.describe('Integrity Sentinel', () => {
  test('Mutation Trap - Must Fail', async () => {
    expect(true).toBe(false);
  });
});
