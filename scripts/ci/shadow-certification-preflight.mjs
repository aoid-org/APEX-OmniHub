#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const OUTPUT_PATH = process.env.PREFLIGHT_OUTPUT_PATH || 'shadow-preflight.json';
const strict = process.argv.includes('--strict');
const strictIfEnabled = process.argv.includes('--strict-if-enabled');

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addBlocker(blockers, id, severity, message, remediation) {
  blockers.push({ id, severity, message, remediation });
}

async function getGitHubEnvironment() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const environmentName = process.env.GITHUB_PRODUCTION_SHADOW_ENVIRONMENT || 'production-shadow';

  if (!hasValue(token) || !hasValue(repository)) {
    return {
      ok: false,
      environmentName,
      reason: 'GITHUB_TOKEN or GITHUB_REPOSITORY unavailable for environment verification',
    };
  }

  const url = `https://api.github.com/repos/${repository}/environments/${encodeURIComponent(environmentName)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'apex-omnihub-shadow-certification-preflight',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      environmentName,
      reason: `GitHub API returned HTTP ${response.status}`,
    };
  }

  const environment = await response.json();
  const protectionRules = Array.isArray(environment.protection_rules)
    ? environment.protection_rules
    : [];
  const hasReviewerProtection = protectionRules.some((rule) => rule.type === 'required_reviewers');

  return {
    ok: true,
    environmentName,
    hasReviewerProtection,
    protectionRuleCount: protectionRules.length,
  };
}

async function main() {
  const blockers = [];
  const shadowEnabled = process.env.ENABLE_SHADOW_DEPLOYMENT === 'true';
  const routingFlipEnabled = process.env.ENABLE_ATOMIC_ROUTING_FLIP === 'true';

  if (!shadowEnabled) {
    addBlocker(
      blockers,
      'B-1',
      'P0',
      'Shadow deployment is disabled because ENABLE_SHADOW_DEPLOYMENT is not true.',
      'Set repository variable ENABLE_SHADOW_DEPLOYMENT=true after provisioning the Cloudflare Pages shadow project.',
    );
  }

  const cloudflareRequirements = [
    ['CLOUDFLARE_API_TOKEN', 'repository secret CLOUDFLARE_API_TOKEN'],
    ['CLOUDFLARE_ACCOUNT_ID', 'repository secret CLOUDFLARE_ACCOUNT_ID'],
    ['CLOUDFLARE_SHADOW_PROJECT_NAME', 'repository variable CLOUDFLARE_SHADOW_PROJECT_NAME'],
    ['SHADOW_HEALTH_URL', 'repository variable SHADOW_HEALTH_URL'],
  ];
  const missingCloudflare = cloudflareRequirements
    .filter(([name]) => !hasValue(process.env[name]))
    .map(([, label]) => label);

  if (missingCloudflare.length > 0) {
    addBlocker(
      blockers,
      'B-1',
      'P0',
      `Cloudflare shadow deployment prerequisites are missing: ${missingCloudflare.join(', ')}.`,
      'Provision the Cloudflare Pages shadow slot and set the required repository secrets/variables.',
    );
  }

  if (!routingFlipEnabled) {
    console.warn('Atomic routing flip is disabled. Terraform apply will be skipped.');
  }

  if (routingFlipEnabled && !hasValue(process.env.TF_TOKEN)) {
    addBlocker(
      blockers,
      'B-3',
      'P1',
      'Terraform token is missing while atomic routing flip is enabled.',
      'Set repository secret TF_TOKEN before enabling the protected Terraform apply path.',
    );
  }

  let githubEnvironment = { ok: true, environmentName: 'production-shadow', reason: 'Skipped due to routing flip disabled' };
  if (routingFlipEnabled) {
    githubEnvironment = await getGitHubEnvironment();
    if (!githubEnvironment.ok) {
      addBlocker(
        blockers,
        'B-3',
        'P1',
        `GitHub Environment production-shadow could not be verified: ${githubEnvironment.reason}.`,
        'Create the production-shadow GitHub Environment with required reviewers before enabling Terraform apply.',
      );
    } else if (!githubEnvironment.hasReviewerProtection) {
      addBlocker(
        blockers,
        'B-3',
        'P1',
        'GitHub Environment production-shadow exists but has no required reviewer protection rule.',
        'Configure required reviewers on the production-shadow GitHub Environment.',
      );
    }
  }

  // B-2 (release-evidence.json not yet produced) is intentionally not checked here.
  // It is a downstream outcome — write-release-evidence.mjs computes the verdict
  // after the release run completes and B-1/B-3 are satisfied.
  const status = blockers.length === 0 ? 'pass' : 'blocked';
  const result = {
    status,
    generated_at: new Date().toISOString(),
    shadow_deployment_enabled: shadowEnabled,
    atomic_routing_flip_enabled: routingFlipEnabled,
    github_environment: githubEnvironment,
    blockers,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `status=${status}\nblocker_count=${blockers.length}\n`, { flag: 'a' });
  }

  if (strict || (strictIfEnabled && shadowEnabled && status !== 'pass')) {
    process.exit(status === 'pass' ? 0 : 1);
  }
}

try {
  await main();
} catch (error) {
  // Preserve the script's fail-closed behavior while using ES2022 top-level await.
  console.error(`shadow certification preflight failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
