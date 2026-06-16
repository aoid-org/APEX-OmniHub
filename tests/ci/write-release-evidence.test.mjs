import assert from 'node:assert/strict';
import { computeVerdict } from '../../scripts/ci/write-release-evidence.mjs';

const base = {
  releaseCut: 'true',
  preflight: { status: 'pass' },
  shadowUrl: 'https://example.pages.dev',
  health: 'pass',
  validator: 'pass',
  terraformPlan: 'pass',
  terraformPlanOutcome: 'success',
};

const cases = [
  ['missing', undefined, 'CERTIFICATION_PENDING_TERRAFORM_APPLY'],
  ['skipped', 'skipped', 'CERTIFICATION_PENDING_TERRAFORM_APPLY'],
  ['pending', 'pending', 'CERTIFICATION_PENDING_TERRAFORM_APPLY'],
  ['fail', 'fail', 'NOT_CERTIFIED_BLOCKED'],
  ['pass', 'pass', 'CERTIFIED'],
  ['pass + skipped outcome', 'pass', 'CERTIFICATION_PENDING_TERRAFORM_APPLY', 'skipped'],
  ['pass + failure outcome', 'pass', 'NOT_CERTIFIED_BLOCKED', 'failure'],
  ['pass + success outcome', 'pass', 'CERTIFIED', 'success'],
];

for (const [name, terraformApply, expected, explicitOutcome] of cases) {
  assert.equal(
    computeVerdict({ ...base, terraformApply, terraformApplyOutcome: explicitOutcome ?? (terraformApply === 'pass' ? 'success' : terraformApply) }),
    expected,
    `plan pass + apply ${name}`,
  );
}

console.log('write-release-evidence verdict tests passed');
