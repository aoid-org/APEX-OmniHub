#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const outDir = path.resolve('artifacts/production-validation');
fs.mkdirSync(outDir, { recursive: true });
const summaryPath = path.join(outDir, 'performance-summary.json');
const target = process.env.APEX_PROD_URL || 'https://apexomnihub.icu';

const write = (payload) => fs.writeFileSync(summaryPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), target, ...payload }, null, 2)}\n`);

const version = spawnSync('k6', ['version'], { encoding: 'utf8' });
if (version.status !== 0) {
  write({ status: 'BLOCKED', blocker: 'k6 binary is not installed or not on PATH', thresholds: { http_req_failed: 'rate<0.01', http_req_duration: 'p(95)<1000,p(99)<2000', checks: 'rate>0.99' } });
  console.error(`✗ perf:k6:smoke BLOCKED — k6 is not available. Evidence: ${summaryPath}`);
  process.exit(2);
}

const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  vus: 1,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    checks: ['rate>0.99'],
  },
};
export default function () {
  const res = http.get(__ENV.APEX_PROD_URL || '${target}');
  check(res, { 'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400 });
  sleep(1);
}
`;
const scriptPath = path.join(os.tmpdir(), `apex-k6-smoke-${Date.now()}.js`);
fs.writeFileSync(scriptPath, script);
const run = spawnSync('k6', ['run', scriptPath], { encoding: 'utf8', env: { ...process.env, APEX_PROD_URL: target } });
write({ status: run.status === 0 ? 'VERIFIED' : 'FAILED', exitStatus: run.status, stdoutTail: run.stdout.slice(-4000), stderrTail: run.stderr.slice(-4000), thresholds: { http_req_failed: 'rate<0.01', http_req_duration: 'p(95)<1000,p(99)<2000', checks: 'rate>0.99' }, liveProductionTouched: true, backendPersistenceProven: false });
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);
process.exit(run.status ?? 1);
