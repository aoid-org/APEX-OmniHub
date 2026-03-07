#!/usr/bin/env tsx
/**
 * Apple Sign-In Client Secret JWT Generator
 *
 * Apple's OAuth requires the client_secret to be a JWT signed with ES256
 * using a .p8 private key from the Apple Developer portal.
 *
 * Usage:
 *   npm run apple:secret -- \
 *     --team-id YOUR_TEAM_ID \
 *     --key-id YOUR_KEY_ID \
 *     --client-id com.apexomnihub.web.login \
 *     --key-path /path/to/AuthKey.p8 \
 *     --expiry-days 180
 *
 * Interactive mode (prompts for missing values):
 *   npm run apple:secret
 */

import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';
import { createInterface } from 'node:readline';

interface AppleSecretConfig {
  teamId: string;
  keyId: string;
  clientId: string;
  keyPath: string;
  expiryDays: number;
}

function base64url(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function parseArgs(): Partial<AppleSecretConfig> {
  const args = process.argv.slice(2);
  const config: Partial<AppleSecretConfig> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--team-id':
        config.teamId = args[++i];
        break;
      case '--key-id':
        config.keyId = args[++i];
        break;
      case '--client-id':
        config.clientId = args[++i];
        break;
      case '--key-path':
        config.keyPath = args[++i];
        break;
      case '--expiry-days':
        config.expiryDays = parseInt(args[++i], 10);
        break;
    }
  }

  return config;
}

async function prompt(rl: ReturnType<typeof createInterface>, question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function promptMissing(partial: Partial<AppleSecretConfig>): Promise<AppleSecretConfig> {
  const hasMissing = !partial.teamId || !partial.keyId || !partial.keyPath;

  if (!hasMissing) {
    return {
      teamId: partial.teamId!,
      keyId: partial.keyId!,
      clientId: partial.clientId || 'com.apexomnihub.web.login',
      keyPath: partial.keyPath!,
      expiryDays: partial.expiryDays || 180,
    };
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const teamId = partial.teamId || await prompt(rl, 'Apple Team ID');
    const keyId = partial.keyId || await prompt(rl, 'Apple Key ID');
    const clientId = partial.clientId || await prompt(rl, 'Service ID (Client ID)', 'com.apexomnihub.web.login');
    const keyPath = partial.keyPath || await prompt(rl, 'Path to .p8 private key file');
    const expiryDaysStr = partial.expiryDays ? String(partial.expiryDays) : await prompt(rl, 'Expiry (days)', '180');

    return {
      teamId,
      keyId,
      clientId,
      keyPath,
      expiryDays: parseInt(expiryDaysStr, 10) || 180,
    };
  } finally {
    rl.close();
  }
}

function generateAppleClientSecret(config: AppleSecretConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + config.expiryDays * 24 * 60 * 60;

  const header = { alg: 'ES256', kid: config.keyId, typ: 'JWT' };
  const payload = {
    iss: config.teamId,
    iat: now,
    exp: expiry,
    aud: 'https://appleid.apple.com',
    sub: config.clientId,
  };

  const keyPem = readFileSync(config.keyPath, 'utf-8');
  const privateKey = createPrivateKey({ key: keyPem, format: 'pem' });

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const signature = sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${signingInput}.${base64url(signature)}`;
}

async function main() {
  console.log('Apple Sign-In Client Secret Generator\n');

  const partial = parseArgs();
  const config = await promptMissing(partial);

  // Validate key file
  try {
    readFileSync(config.keyPath);
  } catch {
    console.error(`Error: Cannot read key file at ${config.keyPath}`);
    process.exit(1);
  }

  const jwt = generateAppleClientSecret(config);

  console.log('\n--- Apple Client Secret JWT ---');
  console.log(jwt);
  console.log('\n--- Configuration ---');
  console.log(`Team ID:    ${config.teamId}`);
  console.log(`Key ID:     ${config.keyId}`);
  console.log(`Client ID:  ${config.clientId}`);
  console.log(`Expires:    ${config.expiryDays} days from now`);
  console.log('\nPaste this JWT as the Client Secret in Supabase Dashboard');
  console.log('(Authentication > Providers > Apple > Secret Key)');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
