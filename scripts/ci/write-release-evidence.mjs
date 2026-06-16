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

export function computeVerdict({ releaseCut, preflight, shadowUrl, health, validator, terraformPlan, terraformApply }) {
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

const preflight = readPreflight();
const published = value('PUBLISHED_RAW', 'false');
const releaseCut = value('RELEASE_CUT_RAW', 'false');
const shadowUrl = value('SHADOW_URL_RAW');
const health = value('HEALTH_RAW', 'skipped');
const validator = value('VALIDATOR_RAW', 'skipped');
const terraform = value('TF_RESULT_RAW', 'skipped');       // plan result (backward compat)
const terraformApply = value('TF_APPLY_RESULT_RAW', '');   // apply result (empty = not yet run)
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
  terraform_plan_result: terraform,    // was terraform_result
  terraform_apply_result: terraformApply,  // NEW field
  terraform_result: terraform,         // keep for schema compat (maps to plan)
  shadow_preflight_status: preflight.status,
  blockers: Array.isArray(preflight.blockers) ? preflight.blockers : [],
  final_verdict: computeVerdict({ releaseCut, preflight, shadowUrl, health, validator, terraformPlan: terraform, terraformApply }),
  timestamp: new Date().toISOString(),
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
