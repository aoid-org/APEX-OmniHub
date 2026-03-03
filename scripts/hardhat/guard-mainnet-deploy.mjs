#!/usr/bin/env node

const allowMainnetDeploy = process.env.ALLOW_MAINNET_DEPLOY === 'true';

if (!allowMainnetDeploy) {
  console.error(
    '[hardhat:deploy:mainnet] Blocked. Set ALLOW_MAINNET_DEPLOY=true to allow mainnet deployment.'
  );
  process.exit(1);
}

console.log('[hardhat:deploy:mainnet] ALLOW_MAINNET_DEPLOY=true confirmed. Proceeding.');
