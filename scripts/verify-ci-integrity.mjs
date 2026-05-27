#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];
const workflowDir = '.github/workflows';

if (!existsSync(workflowDir)) {
  failures.push('Missing .github/workflows directory.');
}

const workflowFiles = existsSync(workflowDir)
  ? readdirSync(workflowDir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  : [];

const releaseLikeWorkflows = [];
for (const workflowFile of workflowFiles) {
  const fullPath = join(workflowDir, workflowFile);
  const content = readFileSync(fullPath, 'utf8');
  const normalized = content.toLowerCase();

  if (content.includes('|| true')) {
    failures.push(`${fullPath}: forbidden '|| true' detected.`);
  }

  if (/(component not yet active, passing|placeholder success|fake-pass|stub pass)/i.test(content)) {
    failures.push(`${fullPath}: placeholder/fake-pass text detected.`);
  }

  if (workflowFile.includes('release') || normalized.includes('verify:release')) {
    releaseLikeWorkflows.push({ fullPath, content });
    if (/\bcontinue-on-error\s*:\s*true\b/i.test(content)) {
      failures.push(`${fullPath}: continue-on-error:true is not allowed in release gates.`);
    }
  }

  if (workflowFile.includes('rsi')) {
    if (!normalized.includes('rsi:ci') && !normalized.includes('tools/rsi/build_evidence.py')) {
      failures.push(`${fullPath}: RSI workflow must execute a real RSI policy/evidence gate.`);
    }
  }
}

if (releaseLikeWorkflows.length !== 1) {
  failures.push(`Expected exactly one release gate workflow; found ${releaseLikeWorkflows.length}.`);
}

for (const workflow of releaseLikeWorkflows) {
  if (!workflow.content.includes('verify:release')) {
    failures.push(`${workflow.fullPath}: release workflow must run verify:release.`);
  }
}

if (failures.length > 0) {
  console.error('CI integrity verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`CI integrity verification passed (${workflowFiles.length} workflow files scanned).`);
