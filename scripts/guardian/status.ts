import { getLoopStatuses, recordLoopHeartbeat } from '../../src/guardian/heartbeat';
import { startGuardianLoops } from '../../src/guardian/loops';

const TIMEOUT_MS = Number(process.env.GUARDIAN_STATUS_TIMEOUT_MS ?? 30000);
const debugEnabled = (process.env.DEBUG ?? '').includes('guardian');
const debug = (message: string, meta?: Record<string, unknown>) => {
  if (debugEnabled) {
    console.log(`[guardian:status] ${message}`, meta ?? '');
  }
};

async function main() {
  const start = Date.now();

  // Safety timeout to avoid hanging if loops never settle
  const timeout = setTimeout(() => {
    console.error(`guardian:status timed out after ${TIMEOUT_MS}ms`);
    process.exit(2);
  }, TIMEOUT_MS);

  try {
    debug('starting guardian loops');
    // Ensure loops are active before reporting
    startGuardianLoops();
    recordLoopHeartbeat('guardian-status-cli');

    debug('collecting loop statuses');
    const statuses = getLoopStatuses();
    const payload = { generatedAt: new Date().toISOString(), statuses };
    debug('status payload ready', { elapsedMs: Date.now() - start, count: statuses.length });
    console.log(JSON.stringify(payload, null, 2));
  } finally {
    clearTimeout(timeout);
    // Force exit so background intervals don't keep the process alive
    setImmediate(() => {
      debug('exiting guardian:status', { elapsedMs: Date.now() - start });
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error('Failed to fetch guardian status', err);
  process.exit(1);
});

