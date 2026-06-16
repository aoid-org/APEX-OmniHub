// Node.js built-in assert, no external deps
import assert from 'node:assert/strict';

// Copy/inline the computeVerdict function here so the test has no import side-effects.
// (Or import it if the function is exported — add an export to write-release-evidence.mjs if needed.)

function computeVerdict({ releaseCut, preflight, shadowUrl, health, validator, terraformPlan, terraformApply }) {
  if (releaseCut !== 'true') {
    return 'NOT_CERTIFIED_NO_RELEASE_CUT';
  }

  if (preflight.status !== 'pass') {
    return 'NOT_CERTIFIED_BLOCKED';
  }

  if (!shadowUrl || health !== 'pass' || validator !== 'pass') {
    return 'NOT_CERTIFIED_BLOCKED';
  }

  if (terraformPlan !== 'pass') {
    return 'NOT_CERTIFIED_BLOCKED';
  }

  if (terraformApply === 'pass') {
    return 'CERTIFIED';
  }

  if (terraformApply === 'fail') {
    return 'NOT_CERTIFIED_BLOCKED';
  }

  // missing, 'skipped', 'pending', '' — apply has not run yet
  return 'CERTIFICATION_PENDING_TERRAFORM_APPLY';
}

const PASS_PREFLIGHT = { status: 'pass' };
const PASS_CTX = { releaseCut: 'true', preflight: PASS_PREFLIGHT, shadowUrl: 'https://x.pages.dev', health: 'pass', validator: 'pass', terraformPlan: 'pass' };

// Test cases
assert.equal(computeVerdict({ ...PASS_CTX, terraformApply: '' }),        'CERTIFICATION_PENDING_TERRAFORM_APPLY', 'missing apply => pending');
assert.equal(computeVerdict({ ...PASS_CTX, terraformApply: 'skipped' }), 'CERTIFICATION_PENDING_TERRAFORM_APPLY', 'skipped apply => pending');
assert.equal(computeVerdict({ ...PASS_CTX, terraformApply: 'pending' }), 'CERTIFICATION_PENDING_TERRAFORM_APPLY', 'pending apply => pending');
assert.equal(computeVerdict({ ...PASS_CTX, terraformApply: 'fail' }),    'NOT_CERTIFIED_BLOCKED',                 'failed apply => blocked');
assert.equal(computeVerdict({ ...PASS_CTX, terraformApply: 'pass' }),    'CERTIFIED',                             'pass apply => certified');
assert.equal(computeVerdict({ ...PASS_CTX, terraformPlan: 'skipped', terraformApply: 'pass' }), 'NOT_CERTIFIED_BLOCKED', 'plan missing => blocked even if apply pass');

console.log('release-evidence-verdict: all 6 tests passed');
