#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(file, needle, message) {
  const contents = read(file);
  assert(contents.includes(needle), `${message} (${file})`);
}

const productionRoot = 'terraform/environments/production';
const productionMain = `${productionRoot}/main.tf`;
const releaseWorkflow = '.github/workflows/release.yml';

assert(exists(`${productionRoot}/cloudflare/main.tf`), 'Missing production-local Cloudflare module copy.');
assert(exists(`${productionRoot}/upstash/main.tf`), 'Missing production-local Upstash module copy.');

const mainTf = read(productionMain);
assert(mainTf.includes('organization = "APEX-OmniHub"'), 'Production HCP Terraform organization must be APEX-OmniHub.');
assert(mainTf.includes('name = "omnihub-production"'), 'Production HCP Terraform workspace must be omnihub-production.');
assert(mainTf.includes('source = "./cloudflare"'), 'Production Cloudflare module source must stay inside the upload root.');
assert(mainTf.includes('source = "./upstash"'), 'Production Upstash module source must stay inside the upload root.');
assert(!/source\s*=\s*"\.\.\/\.\.\/modules\/(cloudflare|upstash)"/.test(mainTf), 'Production module sources must not escape to ../../modules.');

const workflow = read(releaseWorkflow);
assert(workflow.includes('cd terraform/environments/production'), 'Release workflow must run Terraform from terraform/environments/production.');
assert(workflow.includes('TF_TOKEN_app_terraform_io: ${{ secrets.TF_PROD_TOKEN }}'), 'Release workflow must expose TF_PROD_TOKEN as TF_TOKEN_app_terraform_io.');
assert(workflow.includes('cli_config_credentials_token: ${{ secrets.TF_PROD_TOKEN }}'), 'Release workflow setup-terraform step must use TF_PROD_TOKEN.');
assert(!workflow.includes('secrets.TF_TOKEN }}'), 'Release workflow must not use the historical TF_TOKEN secret.');

assertIncludes('package.json', '"terraform:production:check"', 'package.json must expose npm run terraform:production:check.');

if (failures.length > 0) {
  console.error('Terraform production recovery preflight failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Terraform production recovery preflight passed.');
console.log('- production modules are bundled under terraform/environments/production');
console.log('- production module sources are self-relative');
console.log('- HCP Terraform organization/workspace match APEX-OmniHub/omnihub-production');
console.log('- release workflow uses the production Terraform directory and TF_PROD_TOKEN');
