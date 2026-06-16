#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const OUTPUT_PATH = process.env.RELEASE_EVIDENCE_OUTPUT_PATH || 'release-evidence.json';
const PREFLIGHT_PATH = process.env.PREFLIGHT_OUTPUT_PATH || 'shadow-preflight.json';

function readPreflight() {
  try {
    return JSON.parse(readFileSync(PREFLIGHT_PATH, 'utf8'));
  } catch (error) {
    return {
      status: 'blocked',
      blockers: [
        {
          id: 'B-1',
          severity: 'P0',
          message: `Shadow preflight evidence unavailable: ${error instanceof Error ? error.message : String(error)}.`,
          remediation: 'Run scripts/ci/shadow-certification-preflight.mjs before writing release evidence.',
        },
      ],
    };
  }
}

function value(name, fallback = '') {
  return process.env[name] || fallback;
}

export function computeVerdict({ releaseCut, preflight, shadowUrl, health, validator, terraformPlan, terraformPlanOutcome, terraformApply, terraformApplyOutcome }) {
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
    return terraformPlanOutcome === 'skipped'
      ? 'CERTIFICATION_PENDING_TERRAFORM_PLAN'
      : 'NOT_CERTIFIED_BLOCKED';
  }

  if (terraformApply === 'pass' && terraformApplyOutcome === 'success') {
    return 'CERTIFIED';
  }

  if (terraformApply === 'pass') {
    return terraformApplyOutcome === 'skipped' || terraformApplyOutcome === 'pending'
      ? 'CERTIFICATION_PENDING_TERRAFORM_APPLY'
      : 'NOT_CERTIFIED_BLOCKED';
  }

  if (terraformApply == null || ['', 'skipped', 'pending', 'blocked', 'missing'].includes(terraformApply)) {
    return 'CERTIFICATION_PENDING_TERRAFORM_APPLY';
  }

  if (terraformApplyOutcome === 'skipped') {
    return 'CERTIFICATION_PENDING_TERRAFORM_APPLY';
  }

  return 'NOT_CERTIFIED_BLOCKED';
}

const preflight = readPreflight();
const published = value('PUBLISHED_RAW', 'false');
const releaseCut = value('RELEASE_CUT_RAW', 'false');
const shadowUrl = value('SHADOW_URL_RAW');
const health = value('HEALTH_RAW', 'skipped');
const validator = value('VALIDATOR_RAW', 'skipped');
const terraformPlan = value('TF_PLAN_RESULT_RAW', value('TF_RESULT_RAW', 'skipped'));
const terraformPlanOutcome = value('TF_PLAN_OUTCOME_RAW', value('TF_OUTCOME_RAW', 'skipped'));
const terraformApply = value('TF_APPLY_RESULT_RAW', 'skipped');
const terraformApplyOutcome = value('TF_APPLY_OUTCOME_RAW', 'skipped');
const workflowRunUrl = `${value('GH_SERVER_URL', 'https://github.com')}/${value('GH_REPOSITORY', 'unknown/repository')}/actions/runs/${value('GH_RUN_ID', 'unknown')}`;

const evidence = {
  schema_version: 1,
  commit_sha: value('GH_SHA', 'unknown'),
  workflow_run_url: workflowRunUrl,
  published,
  release_cut: releaseCut,
  shadow_url: shadowUrl,
  health_result: health,
  validator_result: validator,
  terraform_result: terraformPlan,
  terraform_outcome: terraformPlanOutcome,
  terraform_plan_result: terraformPlan,
  terraform_plan_outcome: terraformPlanOutcome,
  terraform_apply_result: terraformApply,
  terraform_apply_outcome: terraformApplyOutcome,
  shadow_preflight_status: preflight.status,
  blockers: Array.isArray(preflight.blockers) ? preflight.blockers : [],
  final_verdict: computeVerdict({ releaseCut, preflight, shadowUrl, health, validator, terraformPlan, terraformPlanOutcome, terraformApply, terraformApplyOutcome }),
  timestamp: new Date().toISOString(),
};

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}
