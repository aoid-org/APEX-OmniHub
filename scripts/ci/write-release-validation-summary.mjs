import fs from 'node:fs';

const outputPath = process.env.RELEASE_VALIDATION_SUMMARY_OUTPUT_PATH || 'release-validation-summary.json';
const preflightPath = process.env.PREFLIGHT_OUTPUT_PATH || 'shadow-preflight.json';

let preflightStatus = 'skipped';
let preflightBlockers = [];

if (fs.existsSync(preflightPath)) {
  try {
    const preflightRaw = fs.readFileSync(preflightPath, 'utf8');
    const preflight = JSON.parse(preflightRaw);
    preflightStatus = preflight.status || 'skipped';
    preflightBlockers = preflight.blockers || [];
  } catch (err) {
    preflightStatus = 'blocked';
    preflightBlockers = [{
      id: "VALIDATION_PREFLIGHT_PARSE_ERROR",
      severity: "P0",
      message: "Shadow preflight evidence could not be parsed.",
      remediation: "Ensure scripts/ci/shadow-certification-preflight.mjs completes successfully."
    }];
  }
} else {
  preflightStatus = 'blocked';
  preflightBlockers = [{
    id: "VALIDATION_PREFLIGHT_UNAVAILABLE",
    severity: "P0",
    message: "Shadow preflight evidence unavailable.",
    remediation: "Run scripts/ci/shadow-certification-preflight.mjs before writing validation summary."
  }];
}

const summary = {
  schema_version: 1,
  commit_sha: process.env.GH_SHA || 'unknown',
  workflow_run_url: (process.env.GH_SERVER_URL && process.env.GH_REPOSITORY && process.env.GH_RUN_ID)
    ? `${process.env.GH_SERVER_URL}/${process.env.GH_REPOSITORY}/actions/runs/${process.env.GH_RUN_ID}`
    : 'unknown',
  release_cut_detected: process.env.RELEASE_CUT_RAW === 'true',
  shadow_preflight_status: preflightStatus,
  shadow_preflight_blockers: preflightBlockers,
  shadow_url: process.env.SHADOW_URL_RAW || '',
  health_result: process.env.HEALTH_RAW || 'skipped',
  validator_result: process.env.VALIDATOR_RAW || 'skipped',
  terraform_plan_result: process.env.TF_PLAN_RESULT_RAW || 'skipped',
  terraform_plan_outcome: process.env.TF_PLAN_OUTCOME_RAW || 'skipped',
  terraform_apply_result: process.env.TF_APPLY_RESULT_RAW || 'pending',
  terraform_apply_outcome: process.env.TF_APPLY_OUTCOME_RAW || 'pending',
  timestamp: new Date().toISOString()
};

fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
console.log(`Validation summary written to ${outputPath}`);
