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
  const url = `https://api.github.com${apiPath}`;
  const response = await fetch(url, {
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

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function parseRemoteToRepo(remoteUrl) {
  if (!remoteUrl) return null;

  const httpsMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

function discoverRepo() {
  const gitConfigPath = path.join(REPO_ROOT, '.git', 'config');
  if (fs.existsSync(gitConfigPath)) {
    const gitConfig = fs.readFileSync(gitConfigPath, 'utf8');
    const originBlockMatch = gitConfig.match(/\[remote "origin"\]([\s\S]*?)(?:\n\[|$)/);
    if (originBlockMatch) {
      const urlMatch = originBlockMatch[1].match(/\n\s*url\s*=\s*(.+)\s*/);
      if (urlMatch) {
        const parsed = parseRemoteToRepo(urlMatch[1].trim());
        if (parsed) return parsed;
      }
    }
  }

  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const repositoryValue = packageJson?.repository;
      const repositoryUrl =
        typeof repositoryValue === 'string'
          ? repositoryValue
          : typeof repositoryValue?.url === 'string'
            ? repositoryValue.url
            : null;
      if (repositoryUrl) {
        const cleaned = repositoryUrl.replace(/^git\+/, '');
        const parsed = parseRemoteToRepo(cleaned);
        if (parsed) return parsed;
      }
    } catch {
      // Continue to next fallback.
    }
  }

  const fromEnv = process.env.GITHUB_REPOSITORY;
  if (fromEnv && /^[^/]+\/[^/]+$/.test(fromEnv)) {
    const [owner, repo] = fromEnv.split('/');
    return { owner, repo };
  }

  throw new Error('Unable to discover repository. Set GITHUB_REPOSITORY=owner/repo.');
}

function extractWorkflowName(workflowText, filename) {
  const nameMatch = workflowText.match(/^name:\s*(.+)$/m);
  if (nameMatch) return nameMatch[1].trim();
  return path.basename(filename, path.extname(filename));
}

function extractJobs(workflowText) {
  const lines = workflowText.split(/\r?\n/);
  const jobsStart = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (jobsStart === -1) return [];

  const jobs = [];
  let current = null;

  for (let i = jobsStart + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.match(/^\s*/)?.[0].length ?? 0;

    if (indent === 0) break;

    const jobHeaderMatch = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/);
    if (jobHeaderMatch) {
      current = { id: jobHeaderMatch[1], name: null };
      jobs.push(current);
      continue;
    }

    if (!current) continue;

    const jobNameMatch = line.match(/^\s{4}name:\s*(.+)$/);
    if (jobNameMatch && current.name === null) {
      current.name = jobNameMatch[1].trim();
    }
  }

  return jobs.map((job) => ({ ...job, displayName: job.name || job.id }));
}

function hasSmokeInvocation(...workflowTexts) {
  const smokePattern = /(node|tsx|ts-node|pnpm\s+tsx|npm\s+run\s+smoke-test)[^\n]*scripts\/smoke-test\.ts|npm\s+run\s+smoke-test/;
  return workflowTexts.some((text) => smokePattern.test(text));
}

function selectPrimaryJob(workflowPath, jobs, selectorLabel, preferencePatterns) {
  if (jobs.length === 0) {
    console.error(`UNCERTAIN: Multiple candidate jobs found in ${workflowPath}; refusing to guess.`);
    process.exit(1);
  }

  for (const pattern of preferencePatterns) {
    const matches = jobs.filter((job) => pattern.test(job.id) || pattern.test(job.displayName));
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

  const ciJob = selectPrimaryJob(ciPath, ciJobs, 'primary test', [/build-and-test/i, /test/i, /runtime/i]);
  const secJob = selectPrimaryJob(secPath, secJobs, 'security scan', [/security-invariants/i, /security invariant/i, /security/i, /audit/i]);

  const smokeInvoked = hasSmokeInvocation(ciText, secText);
  if (!smokeInvoked) {
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

  const checkRunsResp = await ghFetch(`/repos/${owner}/${repo}/commits/${sha}/check-runs`);
  const checkRunNames = new Set((checkRunsResp?.check_runs || []).map((c) => c.name));

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

  return {
    candidates: candidateGroups,
    contexts,
  };
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

    try {
      const response = await ghFetch(`/repos/${owner}/${repo}/branches/main/protection`, {
        method: 'PUT',
        body: payload,
      });
      console.log('🟢 Protection applied to main');
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('🔴 Failed to apply branch protection');
      console.error(message);
      process.exit(1);
    }
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
