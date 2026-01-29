import { describe, it, expect, beforeAll } from 'vitest';
import { IronLawVerifier } from '../core/iron-law';
import type { AgentTask } from '../core/types';
import { nanoid } from 'nanoid';

describe('IronLawVerifier - Core Functionality', () => {
  let verifier: IronLawVerifier;

  beforeAll(() => {
    verifier = new IronLawVerifier();
  });

  it('should create verifier instance', () => {
    expect(verifier).toBeDefined();
    expect(verifier).toBeInstanceOf(IronLawVerifier);
  });

  it('should have verify method', () => {
    expect(verifier.verify).toBeDefined();
    expect(typeof verifier.verify).toBe('function');
  });

  it('should generate verification result with required fields', async () => {
    const task: AgentTask = {
      id: nanoid(),
      description: 'Test task',
      modifiedFiles: ['apex-resilience/tests/iron-law.spec.ts'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };

    const result = await verifier.verify(task);

    expect(result).toBeDefined();
    expect(result.taskId).toBe(task.id);
    expect(result.status).toMatch(/APPROVED|REJECTED|REQUIRES_HUMAN_REVIEW/);
    expect(result.evidence).toBeDefined();
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.timestamp).toBeDefined();
    expect(result.verificationLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should include test evidence in verification result', async () => {
    const task: AgentTask = {
      id: nanoid(),
      description: 'Test task with evidence check',
      modifiedFiles: ['apex-resilience/tests/iron-law.spec.ts'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };

    const result = await verifier.verify(task);

    const testEvidence = result.evidence.find((e) => e.type === 'test_result');
    expect(testEvidence).toBeDefined();
    if (testEvidence?.type === 'test_result') {
      expect(testEvidence.exitCode).toBeDefined();
      expect(testEvidence.coverage).toBeGreaterThanOrEqual(0);
      expect(testEvidence.coverage).toBeLessThanOrEqual(100);
      expect(testEvidence.logPath).toBeDefined();
      expect(testEvidence.timestamp).toBeDefined();
    }
  });

  it('should require human review for critical file changes', async () => {
    const task: AgentTask = {
      id: nanoid(),
      description: 'Modify auth logic',
      modifiedFiles: ['src/auth/login.ts'],
      touchesUI: false,
      touchesSecurity: true,
      timestamp: new Date().toISOString(),
    };

    const result = await verifier.verify(task);

    expect(['REQUIRES_HUMAN_REVIEW', 'REJECTED']).toContain(result.status);
  });

  it('should include security evidence for security-sensitive tasks', async () => {
    const task: AgentTask = {
      id: nanoid(),
      description: 'Security-related change',
      modifiedFiles: ['src/security/validator.ts'],
      touchesUI: false,
      touchesSecurity: true,
      timestamp: new Date().toISOString(),
    };

    const result = await verifier.verify(task);

    const securityEvidence = result.evidence.find((e) => e.type === 'security_scan');
    expect(securityEvidence).toBeDefined();
    if (securityEvidence?.type === 'security_scan') {
      expect(securityEvidence.vulnerabilities).toBeDefined();
      expect(securityEvidence.shadowPromptAttempts).toBeGreaterThanOrEqual(0);
      expect(securityEvidence.reportPath).toBeDefined();
    }
  });

  it('should include visual evidence for UI tasks', async () => {
    const task: AgentTask = {
      id: nanoid(),
      description: 'UI component update',
      modifiedFiles: ['src/components/Button.tsx'],
      touchesUI: true,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };

    const result = await verifier.verify(task);

    const visualEvidence = result.evidence.find((e) => e.type === 'visual_verification');
    expect(visualEvidence).toBeDefined();
    if (visualEvidence?.type === 'visual_verification') {
      expect(visualEvidence.screenshotPath).toBeDefined();
      expect(visualEvidence.pixelDiffScore).toBeGreaterThanOrEqual(0);
      expect(visualEvidence.pixelDiffScore).toBeLessThanOrEqual(100);
      expect(visualEvidence.accessibilityScore).toBeGreaterThanOrEqual(0);
      expect(visualEvidence.accessibilityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(visualEvidence.viewports)).toBe(true);
    }
  });

  it('should complete verification within latency threshold', async () => {
    const task: AgentTask = {
      id: nanoid(),
      description: 'Performance test',
      modifiedFiles: ['apex-resilience/tests/iron-law.spec.ts'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };

    const startTime = Date.now();
    const result = await verifier.verify(task);
    const totalLatency = Date.now() - startTime;

    expect(totalLatency).toBeLessThan(60000); // 60 second max for test environment
    expect(result.verificationLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
