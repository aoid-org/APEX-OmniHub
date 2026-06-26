#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const failures = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const matrix = JSON.parse(read('docs/release/release-validation-matrix.json'));
assert(matrix.decision === 'GO_WITH_CONDITIONS_REPO_VERIFIED__PRODUCTION_CERTIFICATION_REQUIRES_OWNER_VALIDATION', 'release validation decision must preserve manual-production-certification boundary');
assert(Array.isArray(matrix.repoVerified) && matrix.repoVerified.length >= 4, 'matrix must list repo-verified remediations');
assert(Array.isArray(matrix.manualOrBlocked) && matrix.manualOrBlocked.length >= 9, 'matrix must list all live/manual validation gaps');

for (const item of matrix.manualOrBlocked) {
  assert(['BLOCKED', 'REQUIRES_MANUAL_VALIDATION'].includes(item.status), `${item.area} must not be claimed VERIFIED without live evidence`);
  assert(Boolean(item.blocker), `${item.area} must include blocker`);
  assert(Boolean(item.nextAction), `${item.area} must include nextAction`);
}

const action = read('src/omnidash/useOmniDashAction.ts');
assert(action.includes("status: 'LOCAL_LAUNCHED'"), 'non-OAuth launches must be LOCAL_LAUNCHED');
assert(action.includes("confirmation: 'local-launch-only'"), 'local launches must carry local-launch-only confirmation metadata');
assert(action.includes('requiresBackendConfirmation: true'), 'local launches must explicitly require backend confirmation');
assert(!/No backend exchange[^]*status:\s*'LIVE'/.test(action), 'local launch branch must not mark backend-confirmed LIVE');

const depWorkflow = read('.github/workflows/dependency-consolidation.yml');
assert(!depWorkflow.includes('pulls.merge'), 'dependency consolidation workflow must not merge PRs directly');
assert(!/force-merge|mustBeGreen:\s*false/i.test(depWorkflow), 'dependency workflow must not document force-merge / mustBeGreen:false behavior');

for (const file of ['.github/workflows/ci-runtime-gates.yml', '.github/workflows/cd-staging.yml']) {
  const text = read(file);
  assert(!/ci-placeholder\.supabase\.co|mock\.supabase\.co|ci-placeholder-(anon|publishable)-key|mock-key|mock-token|mock-zone|mock-id/i.test(text), `${file} must not contain placeholder/mock release config fallbacks`);
}

if (failures.length > 0) {
  console.error(`❌ release validation matrix failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('✓ release validation matrix verified: repo remediations are enforced and live-only gaps remain blocked/manual.');
