/**
 * IRON DOME ACTIVATION SCRIPT
 * Enforces strict branch protection on 'main' branch.
 * 
 * Usage: node scripts/ops/activate_iron_dome.mjs <GITHUB_TOKEN>
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// --- PHASE 1: INTELLIGENCE GATHERING ---

async function fetchStatusChecks(owner, repo, token) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/main/check-runs`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Iron-Dome-Script'
      }
    });

    if (!response.ok) {
       throw new Error(`Failed to fetch check-runs: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.check_runs || data.check_runs.length === 0) {
        console.warn('⚠️ No check-runs found for main branch. This might result in an empty required_status_checks list.');
        return [];
    }

    // Extract names and verify uniqueness
    const checkNames = new Set(
        data.check_runs
            .map(run => run.name)
            .filter(name => !name.includes('Dependabot') && !name.includes('Codecov')) 
    );

    const contexts = Array.from(checkNames);
    console.log(`🛡️ Discovered status checks: ${JSON.stringify(contexts)}`);
    return contexts;

  } catch (error) {
    console.error(`🔴 STATUS_CHECK_DISCOVERY_FAILED: ${error.message}`);
    console.error("Verify workflows have run at least once. Refusing enforcement to prevent merge deadlock.");
    throw error;
  }
}

function getGitConfigRemote() {
  try {
    const gitConfigPath = path.join(process.cwd(), '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const config = fs.readFileSync(gitConfigPath, 'utf8');
      const match = config.match(/url\s*=\s*(?:https:\/\/github\.com\/|git@github\.com:)([\w-]+\/[\w-.]+?)(\.git)?\s/);
      if (match) {
        const [owner, repo] = match[1].replace('.git', '').split('/');
        return { owner, repo };
      }
    }
  } catch { /* ignore */ }
  return null;
}

function getPackageJsonRemote() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.repository && pkg.repository.url) {
        const match = pkg.repository.url.match(/github\.com[:/]([\w-]+\/[\w-.]+)/);
         if (match) {
            const [owner, repo] = match[1].replace('.git', '').split('/');
            return { owner, repo };
         }
      }
    }
  } catch { /* ignore */ }
  return null;
}

function discoverRepo() {
  // Tier 1: .git/config
  const gitConfig = getGitConfigRemote();
  if (gitConfig) return gitConfig;

  // Tier 2: package.json
  const pkgJson = getPackageJsonRemote();
  if (pkgJson) return pkgJson;

  // Tier 3: Env var
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if (owner && repo) return { owner, repo };
  }

  throw new Error("REPO_DISCOVERY_FAILED: Cannot determine repository from .git/config, package.json, or GITHUB_REPOSITORY env var. Run: export GITHUB_REPOSITORY='owner/repo' then retry.");
}

// --- PHASE 2: ENFORCEMENT SCRIPT GENERATION ---

async function preflight(token) {
  if (!token) throw new Error("GITHUB_TOKEN required");

  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'Iron-Dome-Script'
    }
  });

  if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);

  const scopes = response.headers.get('x-oauth-scopes') || '';
  if (!scopes.toLowerCase().includes('repo')) {
    throw new Error(`TOKEN_SCOPE_INVALID: Token lacks 'repo' scope. Visit https://github.com/settings/tokens and regenerate with 'repo' permission enabled. Current scopes: ${scopes}`);
  }

  const user = await response.json();
  console.log(`🛡️ Token verified for @${user.login}`);
  console.log(`🛡️ Token scopes: ${scopes}`);
  return user.login;
}

async function enforce(owner, repo, token, contexts) {
  const payload = {
    required_status_checks: { strict: true, contexts },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: 1
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
    required_linear_history: true
  };

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/main/protection`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Iron-Dome-Script'
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    const data = await response.json();
    console.log("🛡️ IRON DOME ACTIVE");
    console.log(JSON.stringify(data, null, 2));
  } else {
    const errorBody = await response.text();
    console.error(`🔴 ENFORCEMENT FAILED: ${response.status}`);
    console.error(errorBody);
    if (response.status === 403) {
        throw new Error(`PERMISSION_DENIED: Token user lacks admin permissions on ${owner}/${repo}. Repository settings require admin access to modify branch protection.`);
    }
    throw new Error(`Enforcement failed with status ${response.status}`);
  }
}

// BREAK GLASS ONLY: Remove branch protection
// async function emergencyUnlock(owner, repo, token) {
//   const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/main/protection`, {
//     method: 'DELETE',
//     headers: { Authorization: `token ${token}` }
//   });
//   console.log(response.ok ? '🔓 UNLOCKED' : '🔴 UNLOCK FAILED');
// }

// --- MAIN EXECUTION ---

async function main() {
  const token = process.argv[2] || process.env.GITHUB_TOKEN;
  
  try {
    console.log("🚀 Starting Iron Dome Preflight...");
    await preflight(token);

    console.log("🔍 Discovering Repository Context...");
    const { owner, repo } = discoverRepo();
    console.log(`✅ Targeted Repository: ${owner}/${repo}`);

    console.log("📡 Fetching Active Status Checks...");
    const contexts = await fetchStatusChecks(owner, repo, token);
    
    if (contexts.length === 0) {
         throw new Error("STATUS_CHECK_DISCOVERY_FAILED: No check-runs found for main branch. Verify workflows have run at least once. Refusing enforcement to prevent merge deadlock.");
    }

    console.log("🔒 Engaging Iron Dome Enforcement...");
    await enforce(owner, repo, token, contexts);

  } catch (error) {
    console.error(`❌ FATAL: ${error.message}`);
    process.exit(1);
  }
}

await main();
