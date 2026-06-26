#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const failures = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const allowedStatuses = new Set(['VERIFIED', 'FAILED', 'BLOCKED', 'REQUIRES_MANUAL_VALIDATION', 'HONESTLY_GATED', 'NOT_IN_SCOPE', 'WAIVED']);
const requiredFields = [
  'id',
  'area',
  'status',
  'environment',
  'commandOrProcedure',
  'evidenceArtifactPathOrUrl',
  'owner',
  'blocker',
  'waiverReason',
  'waiverExpiry',
  'lastValidatedTimestamp',
  'confidenceLevel',
  'liveProductionTouched',
  'backendPersistenceProven',
];

const matrix = JSON.parse(read('docs/release/release-validation-matrix.json'));
assert(matrix.decision === 'NO_GO_FOR_FULL_PRODUCTION_CERTIFICATION__HARNESS_READY_LIVE_GAPS_HONEST', 'release validation decision must preserve NO-GO full production certification boundary');
assert(Array.isArray(matrix.preflight) && matrix.preflight.length >= 13, 'matrix must include a preflight access/safety matrix');
assert(Array.isArray(matrix.items) && matrix.items.length >= 13, 'matrix must include release validation items');

const ids = new Set();
for (const item of matrix.items || []) {
  for (const field of requiredFields) assert(Object.hasOwn(item, field), `${item.id || 'unknown'} missing ${field}`);
  assert(!ids.has(item.id), `${item.id} is duplicated`);
  ids.add(item.id);
  assert(allowedStatuses.has(item.status), `${item.id} has unsupported status ${item.status}`);
  assert(typeof item.liveProductionTouched === 'boolean', `${item.id} must declare liveProductionTouched boolean`);
  assert(typeof item.backendPersistenceProven === 'boolean', `${item.id} must declare backendPersistenceProven boolean`);
  assert(Boolean(item.commandOrProcedure), `${item.id} must include an exact command or manual procedure`);
  assert(Boolean(item.evidenceArtifactPathOrUrl), `${item.id} must include evidence artifact path or URL`);
  assert(Boolean(item.owner), `${item.id} must include owner`);
  if (item.status === 'VERIFIED') {
    assert(Boolean(item.lastValidatedTimestamp), `${item.id} VERIFIED items must include lastValidatedTimestamp`);
    assert(Boolean(item.evidenceArtifactPathOrUrl), `${item.id} VERIFIED items must include evidence`);
    assert(!item.liveProductionTouched || item.evidenceArtifactPathOrUrl.includes('artifacts/'), `${item.id} live VERIFIED items must point to retained live evidence artifacts`);
  }
  if (['BLOCKED', 'REQUIRES_MANUAL_VALIDATION', 'HONESTLY_GATED'].includes(item.status)) {
    assert(Boolean(item.blocker), `${item.id} ${item.status} items must include blocker/honest gate reason`);
    assert(item.backendPersistenceProven === false, `${item.id} must not claim backend persistence when not VERIFIED`);
  }
  if (item.status === 'WAIVED') {
    assert(Boolean(item.waiverReason), `${item.id} WAIVED items must include waiverReason`);
    assert(Boolean(item.waiverExpiry), `${item.id} WAIVED items must include waiverExpiry`);
  }
}

for (const id of [
  'CF_DEPLOY_ENV',
  'BROWSER_PUBLIC_ROUTES',
  'REQUEST_ACCESS_PROOF',
  'AUTH_EMAIL_PASSWORD',
  'OAUTH_CALLBACKS',
  'PASSKEY_WEBAUTHN',
  'OMNIDASH_FAKE_SUCCESS_GUARDRAILS',
  'OMNIDASH_LIVE_PERSISTENCE',
  'SUPABASE_RLS_MULTI_TENANT',
  'BYOM_PROVIDER_KEYS',
  'BILLING_PAYMENT_SANDBOX',
  'PWA_MOBILE_WEB',
  'PERFORMANCE_LOAD_K6',
  'BRANCH_PROTECTION_RELEASE_GATES',
]) {
  assert(ids.has(id), `matrix missing required validation item ${id}`);
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

console.log('✓ release validation matrix verified: detailed production-validation items preserve live/manual boundaries and repo guardrails.');
