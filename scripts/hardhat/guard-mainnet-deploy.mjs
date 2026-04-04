#!/usr/bin/env node

/**
 * Mainnet Deploy Guard — Multi-factor safety gate.
 *
 * Prevents accidental mainnet deployments by requiring:
 * 1. Explicit ALLOW_MAINNET_DEPLOY=true env var
 * 2. WEB3_PRIVATE_KEY must NOT be the placeholder value
 * 3. CI environment is detected and warned about
 */

const allowMainnetDeploy = process.env.ALLOW_MAINNET_DEPLOY === 'true';
const privateKey = process.env.WEB3_PRIVATE_KEY || '';
const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS);

if (!allowMainnetDeploy) {
  console.error(
    '[hardhat:deploy:mainnet] Blocked. Set ALLOW_MAINNET_DEPLOY=true to allow mainnet deployment.'
  );
  process.exit(1);
}

if (!privateKey || privateKey === 'your-private-key-here') {
  console.error(
    '[hardhat:deploy:mainnet] Blocked. WEB3_PRIVATE_KEY is missing or set to the placeholder value.'
  );
  process.exit(1);
}

if (isCI) {
  console.warn(
    '[hardhat:deploy:mainnet] WARNING: Running in CI environment. Ensure secrets are vault-injected, not hardcoded.'
  );
}

console.log('[hardhat:deploy:mainnet] All safety checks passed. Proceeding with mainnet deploy.');
