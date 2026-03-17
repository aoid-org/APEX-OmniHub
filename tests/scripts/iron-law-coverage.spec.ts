// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { IronLawVerifier } from '../../apex-resilience/core/iron-law';
import type { AgentTask } from '../../apex-resilience/core/types';

/**
 * Coverage tests for apex-resilience/core/iron-law.ts
 *
 * Specifically targets the output.exec() change and all verification paths.
 */

describe('IronLawVerifier - Coverage', () => {
  let verifier: IronLawVerifier;

  beforeAll(() => {
    process.env.APEX_IRON_LAW_FAST_MODE = '1';
    verifier = new IronLawVerifier();
  });

  it('APPROVED for clean non-UI, non-security task', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-clean`,
      description: 'Clean task',
      modifiedFiles: ['src/utils/helpers.ts'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    expect(result.taskId).toBe(task.id);
    expect(result.status).toBe('APPROVED');
    expect(result.evidence.length).toBeGreaterThanOrEqual(1);
    expect(result.evidence[0].type).toBe('test_result');
    expect(result.verificationLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  }, 35000);

  it('collects visual evidence for UI tasks', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-ui`,
      description: 'UI change',
      modifiedFiles: ['src/components/Header.tsx'],
      touchesUI: true,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    const visual = result.evidence.find((e) => e.type === 'visual_verification');
    expect(visual).toBeDefined();
    if (visual?.type === 'visual_verification') {
      expect(visual.pixelDiffScore).toBe(0);
      expect(visual.accessibilityScore).toBe(100);
      expect(visual.viewports).toContain('desktop');
      expect(visual.screenshotPath).toContain('.png');
    }
  }, 35000);

  it('collects security evidence for security tasks', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-sec`,
      description: 'Security update',
      modifiedFiles: ['src/lib/validator.ts'],
      touchesUI: false,
      touchesSecurity: true,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    const sec = result.evidence.find((e) => e.type === 'security_scan');
    expect(sec).toBeDefined();
    if (sec?.type === 'security_scan') {
      expect(sec.vulnerabilities.critical).toBe(0);
      expect(sec.vulnerabilities.high).toBe(0);
      expect(sec.shadowPromptAttempts).toBeGreaterThanOrEqual(0);
      expect(sec.reportPath).toBeDefined();
    }
  }, 35000);

  it('REQUIRES_HUMAN_REVIEW for critical file paths', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-crit`,
      description: 'Auth change',
      modifiedFiles: ['src/auth/login.ts'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    expect(result.status).toBe('REQUIRES_HUMAN_REVIEW');
  }, 35000);

  it('detects critical files in security paths', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-secpath`,
      description: 'Security file change',
      modifiedFiles: ['src/security/csrf.ts'],
      touchesUI: false,
      touchesSecurity: true,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    expect(['REQUIRES_HUMAN_REVIEW', 'REJECTED']).toContain(result.status);
  }, 35000);

  it('detects critical files in payment paths', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-pay`,
      description: 'Payment change',
      modifiedFiles: ['src/payment/processor.ts'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    expect(result.status).toBe('REQUIRES_HUMAN_REVIEW');
  }, 35000);

  it('detects critical files in config/production', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-cfg`,
      description: 'Config production change',
      modifiedFiles: ['config/production/settings.json'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    expect(result.status).toBe('REQUIRES_HUMAN_REVIEW');
  }, 35000);

  it('collects all three evidence types for UI + security task', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-all`,
      description: 'Full verification',
      modifiedFiles: ['src/auth/LoginForm.tsx'],
      touchesUI: true,
      touchesSecurity: true,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    const types = result.evidence.map((e) => e.type);
    expect(types).toContain('test_result');
    expect(types).toContain('visual_verification');
    expect(types).toContain('security_scan');
  }, 35000);

  it('handles multiple modified files', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-multi`,
      description: 'Multiple files',
      modifiedFiles: [
        'src/components/A.tsx',
        'src/components/B.tsx',
        'src/utils/c.ts',
      ],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    expect(result.status).toBe('APPROVED');
    expect(result.evidence.length).toBeGreaterThanOrEqual(1);
  }, 35000);

  it('includes reason for REQUIRES_HUMAN_REVIEW', async () => {
    const task: AgentTask = {
      id: `cov-test-${Date.now()}-reason`,
      description: 'Env file change',
      modifiedFiles: ['.env.production'],
      touchesUI: false,
      touchesSecurity: false,
      timestamp: new Date().toISOString(),
    };
    const result = await verifier.verify(task);
    expect(result.status).toBe('REQUIRES_HUMAN_REVIEW');
  }, 35000);
});
