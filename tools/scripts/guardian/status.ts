import { getLoopStatuses, recordLoopHeartbeat } from '../../../apps/dashboard/src/guardian/heartbeat';
import { startGuardianLoops } from '../../../apps/dashboard/src/guardian/loops';

async function main() {
  // Ensure loops are active before reporting
  startGuardianLoops();
  recordLoopHeartbeat('guardian-status-cli');

  const statuses = getLoopStatuses();
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), statuses }, null, 2));
}

main().catch((err) => {
  console.error('Failed to fetch guardian status', err);
  process.exit(1);
});

