import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function readRequiredFile(relativePath) {
  const fullPath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`UNCERTAIN: Missing file ${relativePath}.`);
    process.exit(1);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

async function ghFetch(apiPath, { method = 'GET', body } = {}) {
  const token = requireEnv('GITHUB_TOKEN');
  const response = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'apex-iron-dome-enforcer',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${method} ${apiPath} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function stripGitSuffix(value) {
  return value.endsWith('.git') ? value.slice(0, -4) : value;
}

function parseRemoteToRepo(remoteUrl) {
  if (!remoteUrl) return null;
  const cleaned = remoteUrl.trim().replace('git+', '');

  if (cleaned.startsWith('git@github.com:')) {
    const remainder = stripGitSuffix(cleaned.slice('git@github.com:'.length));
    const parts = remainder.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  }

  const githubMarker = 'github.com/';
  const markerIndex = cleaned.indexOf(githubMarker);
  if (markerIndex !== -1) {
    const remainder = stripGitSuffix(cleaned.slice(markerIndex + githubMarker.length));
    const parts = remainder.split('/');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] };
    }
  }

  return null;
}

function discoverRepoFromGitConfig(gitConfigText) {
  const lines = gitConfigText.split(/\r?\n/);
  let inOrigin = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('[') && line.endsWith(']')) {
      inOrigin = line === '[remote "origin"]';
      continue;
    }

    if (!inOrigin) continue;
    if (!line.startsWith('url')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const urlValue = line.slice(eqIndex + 1).trim();
    const parsed = parseRemoteToRepo(urlValue);
    if (parsed) return parsed;
  }

  return null;
}

function discoverRepo() {
  const gitConfigPath = path.join(REPO_ROOT, '.git', 'config');
  if (fs.existsSync(gitConfigPath)) {
    const parsed = discoverRepoFromGitConfig(fs.readFileSync(gitConfigPath, 'utf8'));
    if (parsed) return parsed;
  }

  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const repository = packageJson?.repository;
      const repositoryUrl =
        typeof repository === 'string'
          ? repository
          : typeof repository?.url === 'string'
            ? repository.url
            : null;
      const parsed = parseRemoteToRepo(repositoryUrl);
      if (parsed) return parsed;
    } catch {
      // Continue to env fallback.
    }
  }

  const envRepo = process.env.GITHUB_REPOSITORY;
  if (envRepo) {
    const parts = envRepo.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1] };
    }
  }

  throw new Error('Unable to discover repository. Set GITHUB_REPOSITORY=owner/repo.');
}

function extractWorkflowName(workflowText, filename) {
  const lines = workflowText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('name:')) continue;
    const value = line.slice('name:'.length).trim();
    if (value) return value;
  }
  return path.basename(filename, path.extname(filename));
}

function extractJobs(workflowText) {
  const lines = workflowText.split(/\r?\n/);
  const jobsStart = lines.findIndex((line) => line.trim() === 'jobs:');
  if (jobsStart === -1) return [];

  const jobs = [];
  let currentJob = null;

  for (let i = jobsStart + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const leadingSpaces = line.length - line.trimStart().length;
    if (leadingSpaces === 0) break;

    if (leadingSpaces === 2 && trimmed.endsWith(':')) {
      const id = trimmed.slice(0, -1).trim();
      if (id) {
        currentJob = { id, name: null };
        jobs.push(currentJob);
      }
      continue;
    }

    if (!currentJob) continue;

    if (leadingSpaces === 4 && trimmed.startsWith('name:') && currentJob.name === null) {
      const nameValue = trimmed.slice('name:'.length).trim();
      if (nameValue) currentJob.name = nameValue;
    }
  }

  return jobs.map((job) => ({ ...job, displayName: job.name || job.id }));
}

function hasSmokeInvocation(...workflowTexts) {
  const smokeNeedles = ['scripts/smoke-test.ts', 'npm run smoke-test'];
  return workflowTexts.some((text) => smokeNeedles.some((needle) => text.includes(needle)));
}

function selectPrimaryJob(workflowPath, jobs, preferenceChecks) {
  if (jobs.length === 0) {
    console.error(`UNCERTAIN: Multiple candidate jobs found in ${workflowPath}; refusing to guess.`);
    process.exit(1);
  }

  for (const check of preferenceChecks) {
    const matches = jobs.filter((job) => check(job.id, job.displayName));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      console.error(`UNCERTAIN: Multiple candidate jobs found in ${workflowPath}; refusing to guess.`);
      process.exit(1);
    }
  }

  if (jobs.length === 1) return jobs[0];

  console.error(`UNCERTAIN: Multiple candidate jobs found in ${workflowPath}; refusing to guess.`);
  process.exit(1);
}

async function extractContextsFromWorkflows(owner, repo) {
  const ciPath = '.github/workflows/ci-runtime-gates.yml';
  const secPath = '.github/workflows/security-regression-guard.yml';
  const smokePath = 'scripts/smoke-test.ts';

  const ciText = readRequiredFile(ciPath);
  const secText = readRequiredFile(secPath);
  readRequiredFile(smokePath);

  const ciWorkflowName = extractWorkflowName(ciText, ciPath);
  const secWorkflowName = extractWorkflowName(secText, secPath);

  const ciJobs = extractJobs(ciText);
  const secJobs = extractJobs(secText);

  const ciJob = selectPrimaryJob(ciPath, ciJobs, [
    (id, name) => id === 'build-and-test' || name.toLowerCase().includes('build'),
    (id, name) => id.toLowerCase().includes('test') || name.toLowerCase().includes('test'),
    (id, name) => id.toLowerCase().includes('runtime') || name.toLowerCase().includes('runtime'),
  ]);

  const secJob = selectPrimaryJob(secPath, secJobs, [
    (id) => id === 'security-invariants',
    (_, name) => name.toLowerCase().includes('security invariant'),
    (id, name) => id.toLowerCase().includes('security') || name.toLowerCase().includes('security'),
    (id, name) => id.toLowerCase().includes('audit') || name.toLowerCase().includes('audit'),
  ]);

  if (!hasSmokeInvocation(ciText, secText)) {
    console.log('🛡️ smoke-test.ts not invoked by target workflows; excluded from required checks');
  }

  const candidateGroups = [
    {
      role: 'primary test job',
      candidates: [
        `${ciWorkflowName} / ${ciJob.displayName}`,
        `${ciWorkflowName} / ${ciJob.id}`,
        ciJob.displayName,
        ciJob.id,
      ],
    },
    {
      role: 'security scan job',
      candidates: [
        `${secWorkflowName} / ${secJob.displayName}`,
        `${secWorkflowName} / ${secJob.id}`,
        secJob.displayName,
        secJob.id,
      ],
    },
  ];

  const branch = await ghFetch(`/repos/${owner}/${repo}/branches/main`);
  const sha = branch?.commit?.sha;
  if (!sha) {
    console.error('SYNC-BLOCKED: Required status check contexts could not be verified; refusing to enforce to avoid deadlock.');
    process.exit(1);
  }

  const checkRunsResponse = await ghFetch(`/repos/${owner}/${repo}/commits/${sha}/check-runs`);
  const checkRunNames = new Set((checkRunsResponse?.check_runs || []).map((run) => run.name));

  const contexts = [];
  for (const group of candidateGroups) {
    const matched = group.candidates.find((candidate) => checkRunNames.has(candidate));
    if (!matched) {
      console.error('SYNC-BLOCKED: No matching check-runs found for derived contexts; refusing to enforce.');
      process.exit(1);
    }
    contexts.push(matched);
  }

  if (new Set(contexts).size !== candidateGroups.length) {
    console.error('SYNC-BLOCKED: Required status check contexts could not be verified; refusing to enforce to avoid deadlock.');
    process.exit(1);
  }

  return { candidates: candidateGroups, contexts };
}

async function main() {
  try {
    requireEnv('GITHUB_TOKEN');
    console.log('🛡️ Preflight: token present');

    const user = await ghFetch('/user');
    console.log(`🛡️ Preflight: token valid as @${user.login}`);

    const { owner, repo } = discoverRepo();
    console.log(`🛡️ Repo: ${owner}/${repo}`);

    const { contexts } = await extractContextsFromWorkflows(owner, repo);
    if (!contexts || contexts.length < 2) {
      console.error('SYNC-BLOCKED: Required status check contexts could not be verified; refusing to enforce to avoid deadlock.');
      process.exit(1);
    }

    console.log(`🛡️ PHASE_1_CONTEXTS: ${JSON.stringify(contexts)}`);

    const payload = {
      required_status_checks: { strict: true, contexts },
      enforce_admins: true,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
        required_approving_review_count: 1,
      },
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
      required_linear_history: true,
    };

    const response = await ghFetch(`/repos/${owner}/${repo}/branches/main/protection`, {
      method: 'PUT',
      body: payload,
    });

    console.log('🟢 Protection applied to main');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('🔴 Fatal error');
    console.error(message);
    process.exit(1);
  }
}

// BREAK GLASS ONLY
// async function emergencyUnlock(owner, repo) {
//   await ghFetch(`/repos/${owner}/${repo}/branches/main/protection`, { method: 'DELETE' });
// }

await main();
