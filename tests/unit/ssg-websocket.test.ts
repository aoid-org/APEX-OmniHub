/**
 * tests/unit/ssg-websocket.test.ts
 *
 * SonarQube new-code coverage gate: ≥ 90%
 * Target: apps/omnihub-site/src/ssg-websocket.ts
 *
 * Strategy: test the *observable contract* — not the ws import identity.
 * - When globalThis.WebSocket is undefined on import → the polyfill must
 *   assign a callable constructor (whatever ws exports).
 * - When globalThis.WebSocket is already defined on import → it must not
 *   be replaced.
 *
 * This avoids fighting Vitest's CJS mock-after-resetModules limitation
 * (vi.doMock of a real CJS package in the forks pool resolves the original
 * module regardless of mock registration).
 *
 * Environment: 'node' — this polyfill targets Node 20 SSG, NOT the browser.
 * jsdom injects its own global WebSocket which makes the 'undefined' branch
 * untestable.
 *
 * Line coverage (ssg-websocket.ts):
 *   L11  if (typeof globalThis.WebSocket === 'undefined')   ← both tests
 *   L12    globalThis.WebSocket = WebSocket …               ← test 1
 *
 * 2 / 2 executable lines = 100 % (SonarQube gate requires ≥ 90 %).
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

describe('ssg-websocket polyfill', () => {
  /**
   * Preserve whatever WebSocket global was present before the test so we can
   * fully restore the environment in afterEach.
   */
  let snapshotWS: (typeof globalThis)['WebSocket'] | undefined;

  afterEach(() => {
    vi.resetModules();
    if (snapshotWS === undefined) {
      // @ts-expect-error: clearing non-optional global for test teardown
      delete globalThis.WebSocket;
    } else {
      globalThis.WebSocket = snapshotWS;
    }
    snapshotWS = undefined;
  });

  it('assigns a callable WebSocket to globalThis when WebSocket is absent (Node 20 SSG)', async () => {
    // Capture and remove any pre-existing WebSocket global.
    snapshotWS = globalThis.WebSocket as (typeof globalThis)['WebSocket'] | undefined;
    // @ts-expect-error: removing global for Node-20-like isolation
    delete globalThis.WebSocket;

    // Pre-condition: must be absent before the polyfill runs.
    expect(typeof globalThis.WebSocket).toBe('undefined');

    // Fresh module registry ensures the module body re-executes (L11 + L12).
    vi.resetModules();
    await import('../../apps/omnihub-site/src/ssg-websocket');

    // L12 must have executed: the global must now be a callable constructor.
    expect(typeof globalThis.WebSocket).toBe('function');
  });

  it('leaves an existing globalThis.WebSocket unchanged when WebSocket is already defined', async () => {
    // Provide a sentinel so we can verify no replacement occurred.
    const sentinel = vi.fn() as unknown as (typeof globalThis)['WebSocket'];
    snapshotWS = globalThis.WebSocket as (typeof globalThis)['WebSocket'] | undefined;
    globalThis.WebSocket = sentinel;

    vi.resetModules();
    await import('../../apps/omnihub-site/src/ssg-websocket');

    // L12 must NOT have executed: sentinel must still be the global.
    expect(globalThis.WebSocket).toBe(sentinel);
  });
});
