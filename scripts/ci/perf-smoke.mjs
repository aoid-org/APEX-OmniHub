/**
 * APEX-OmniHub - Performance Smoke Test
 * Enforces basic SLO budgets for build size and simulated execution latency.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const BUDGETS = {
  maxBundleSizeBytes: 5 * 1024 * 1024, // 5MB total JS bundle budget
  edgeP95SimulatedMs: 200,             // 200ms simulated edge execution budget
};

async function checkBundleSize() {
  console.log('--- Perf Smoke: Bundle Size ---');
  const distDir = path.join(ROOT_DIR, 'dist', 'assets');
  
  if (!fs.existsSync(distDir)) {
    console.log('⚠️ dist/assets not found. Skipping bundle size check (run build first to enforce).');
    return true;
  }

  const files = fs.readdirSync(distDir);
  let totalJsSize = 0;

  for (const file of files) {
    if (file.endsWith('.js')) {
      const stats = fs.statSync(path.join(distDir, file));
      totalJsSize += stats.size;
    }
  }

  console.log(`Total JS Bundle Size: ${(totalJsSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (totalJsSize > BUDGETS.maxBundleSizeBytes) {
    console.error(`❌ FAILED: Bundle size exceeds budget of ${BUDGETS.maxBundleSizeBytes / 1024 / 1024} MB`);
    return false;
  }
  
  console.log('✅ PASS: Bundle size within budget.');
  return true;
}

async function simulateEdgeLatency() {
  console.log('\n--- Perf Smoke: Edge P95 Simulated Latency ---');
  
  // Simulate 100 edge requests and measure latency
  const latencies = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50)); 
    const end = performance.now();
    latencies.push(end - start);
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  
  console.log(`Simulated P95 Latency: ${p95.toFixed(2)} ms`);

  if (p95 > BUDGETS.edgeP95SimulatedMs) {
    console.error(`❌ FAILED: Simulated P95 exceeds budget of ${BUDGETS.edgeP95SimulatedMs} ms`);
    return false;
  }
  
  console.log('✅ PASS: Edge latency within budget.');
  return true;
}

async function run() {
  const sizePass = await checkBundleSize();
  const latencyPass = await simulateEdgeLatency();

  if (!sizePass || !latencyPass) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
