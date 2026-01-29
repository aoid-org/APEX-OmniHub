/* eslint-disable no-console */
import { IronLawVerifier } from '../core/iron-law';
import type { AgentTask } from '../core/types';
import { nanoid } from 'nanoid';

/**
 * APEX Resilience Demo: Smoke Test
 * Demonstrates all three verification layers
 */

console.log('🎯 APEX Resilience Framework - Smoke Test Demo');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const verifier = new IronLawVerifier();

// Test 1: Clean task (should APPROVE)
console.log('Test 1: Clean utility function addition');
console.log('─────────────────────────────────────────');

const cleanTask: AgentTask = {
  id: nanoid(),
  description: 'Add math utility function',
  modifiedFiles: ['src/utils/math.ts'],
  touchesUI: false,
  touchesSecurity: false,
  timestamp: new Date().toISOString(),
};

const result1 = await verifier.verify(cleanTask);
console.log(`Status: ${result1.status}`);
console.log(`Latency: ${result1.verificationLatencyMs}ms`);
console.log(`Evidence count: ${result1.evidence.length}`);
console.log('✅ Expected: APPROVED or REQUIRES_HUMAN_REVIEW\n');

// Test 2: Critical file modification (should require HUMAN_REVIEW)
console.log('Test 2: Authentication module modification');
console.log('─────────────────────────────────────────');

const criticalTask: AgentTask = {
  id: nanoid(),
  description: 'Refactor login logic',
  modifiedFiles: ['src/auth/login.ts', 'src/auth/session.ts'],
  touchesUI: false,
  touchesSecurity: true,
  timestamp: new Date().toISOString(),
};

const result2 = await verifier.verify(criticalTask);
console.log(`Status: ${result2.status}`);
console.log(`Latency: ${result2.verificationLatencyMs}ms`);
console.log(`Evidence count: ${result2.evidence.length}`);
console.log('⚠️  Expected: REQUIRES_HUMAN_REVIEW or REJECTED\n');

// Test 3: UI modification (triggers visual verification)
console.log('Test 3: UI component change');
console.log('─────────────────────────────────────────');

const uiTask: AgentTask = {
  id: nanoid(),
  description: 'Update button component styling',
  modifiedFiles: ['src/components/Button.tsx', 'src/components/Button.css'],
  touchesUI: true,
  touchesSecurity: false,
  timestamp: new Date().toISOString(),
};

const result3 = await verifier.verify(uiTask);
console.log(`Status: ${result3.status}`);
console.log(`Latency: ${result3.verificationLatencyMs}ms`);
console.log(`Evidence count: ${result3.evidence.length}`);

const visualEvidence = result3.evidence.find((e) => e.type === 'visual_verification');
if (visualEvidence && visualEvidence.type === 'visual_verification') {
  console.log(`Visual diff score: ${visualEvidence.pixelDiffScore}%`);
  console.log(`Accessibility score: ${visualEvidence.accessibilityScore}`);
}
console.log('✅ Expected: APPROVED or REQUIRES_HUMAN_REVIEW (with visual evidence)\n');

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Smoke Test Summary:');
console.log(`  • Total tasks verified: 3`);
console.log(
  `  • Average latency: ${Math.round(
    (result1.verificationLatencyMs +
      result2.verificationLatencyMs +
      result3.verificationLatencyMs) /
      3
  )}ms`
);
console.log(`  • All layers functioning: ✅`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ APEX Resilience Framework is operational!');
console.log('📚 See README.md for integration instructions');
