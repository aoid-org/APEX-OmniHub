import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { runAdapterStep } from './adapters/index';
import { enforceSandboxGuardrails } from './guards/guardrails';
import { writeJsonReport } from './reporters/json';
import { writeJUnitReport } from './reporters/junit';
import { writeMarkdownReport } from './reporters/markdown';
import type {
  ReportBundle,
  RunnerOptions,
  ScenarioDefinition,
  ScenarioRunResult,
  ScenarioStep,
  StepResult,
} from './types';

function parseScenario(content: string): ScenarioDefinition {
  const parsed = yaml.load(content) as ScenarioDefinition;
  if (!parsed?.name || !parsed?.steps || !parsed?.assertions) {
    throw new Error('Invalid scenario definition.');
  }
  return parsed;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[index];
}

function computeScore(errorRate: number, retryCount: number): number {
  const score = 100 - errorRate * 100 - retryCount * 2;
  return Math.max(0, Math.min(100, score));
}

async function executeStep(
  step: ScenarioStep,
  auditLog: string[],
  mode: RunnerOptions['mode'],
  omnilinkPortUrl?: string,
  injectionDetected = false
): Promise<{ result: StepResult; injectionDetected: boolean }> {
  const start = Date.now();
  let status: StepResult['status'] = 'passed';
  let details: string | undefined;
  let updatedInjection = injectionDetected;

  if (step.action === 'wildcard_injection') {
    updatedInjection = true;
    details = 'Wildcard payload injected.';
  } else {
    const adapterResult = await runAdapterStep(step, {
      mode,
      omnilinkPortUrl,
      auditLog,
      injectionDetected,
    });
    status = adapterResult.status;
    details = adapterResult.details;
  }

  auditLog.push(step.action);
  const durationMs = Date.now() - start;
  const retries = step.retries ?? 0;

  return {
    result: {
      id: step.id,
      action: step.action,
      status,
      durationMs,
      retries,
      details,
    },
    injectionDetected: updatedInjection,
  };
}

function getRawOrchestrationStatus(
  stepResults: StepResult[]
): ScenarioRunResult['status'] {
  if (stepResults.some((result) => result.status === 'failed')) return 'failed';
  if (stepResults.some((result) => result.status === 'blocked'))
    return 'blocked';
  return 'passed';
}

const ENTITY_MUTATION_ACTIONS = new Set<ScenarioStep['action']>([
  'create_doc',
  'emit_event',
  'mint_nft',
  'report_back',
  'send_email',
]);

function evaluateAssertions(
  scenario: ScenarioDefinition,
  stepResults: StepResult[],
  auditLog: string[],
  injectionDetected: boolean,
  rawStatus: ScenarioRunResult['status']
): Record<string, boolean> {
  const assertions: Record<string, boolean> = {};
  for (const assertion of scenario.assertions) {
    switch (assertion.type) {
      case 'orchestration_status':
        assertions[assertion.type] = assertion.expected === rawStatus;
        break;
      case 'audit_contains':
        assertions[assertion.type] =
          Array.isArray(assertion.expected) &&
          assertion.expected.every((expected) => auditLog.includes(expected));
        break;
      case 'entities_updated':
        assertions[assertion.type] = stepResults.some(
          (result) =>
            ENTITY_MUTATION_ACTIONS.has(result.action) &&
            result.status === 'passed'
        );
        break;
      case 'nft_verification_recorded':
        assertions[assertion.type] = stepResults.some(
          (result) => result.action === 'mint_nft'
        );
        break;
      case 'injection_blocked':
        assertions[assertion.type] =
          injectionDetected && rawStatus !== 'passed';
        break;
      case 'no_secret_leak':
        assertions[assertion.type] = !auditLog.some((entry) =>
          entry.toLowerCase().includes('secret')
        );
        break;
      default:
        assertions[assertion.type] = false;
    }
  }

  return assertions;
}

export async function runScenario(
  scenario: ScenarioDefinition,
  options: RunnerOptions
): Promise<ScenarioRunResult> {
  const startedAt = new Date().toISOString();
  if (options.mode === 'sandbox') {
    enforceSandboxGuardrails(options.omnilinkPortUrl);
  }

  const auditLog: string[] = [];
  const steps: StepResult[] = [];
  let injectionDetected = false;

  for (const step of scenario.steps) {
    const result = await executeStep(
      step,
      auditLog,
      options.mode,
      options.omnilinkPortUrl,
      injectionDetected
    );
    steps.push(result.result);
    injectionDetected = result.injectionDetected;
  }

  const rawStatus = getRawOrchestrationStatus(steps);
  const assertions = evaluateAssertions(
    scenario,
    steps,
    auditLog,
    injectionDetected,
    rawStatus
  );
  const failedAssertions =
    Object.values(assertions).filter(Boolean).length !==
    scenario.assertions.length;

  // Scenario status reflects whether the declared assertions passed. Expected guardrail
  // blocks remain successful scenarios when the scenario explicitly asserts `blocked`.
  const status: ScenarioRunResult['status'] = failedAssertions
    ? 'failed'
    : 'passed';

  const durations = steps.map((step) => step.durationMs);
  const retryCount = steps.reduce((sum, step) => sum + step.retries, 0);
  // Expected guardrail blocks are successful control-plane outcomes, not errors.
  const errorCount = steps.filter((step) =>
    failedAssertions ? step.status !== 'passed' : step.status === 'failed'
  ).length;
  const errorRate = steps.length === 0 ? 0 : errorCount / steps.length;
  const metrics = {
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    retryCount,
    errorRate,
    finalScore: computeScore(errorRate, retryCount),
  };

  return {
    scenario,
    status,
    steps,
    assertions,
    auditLog,
    metrics,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

async function loadScenarios(
  scenarioDir: string
): Promise<ScenarioDefinition[]> {
  const files = await readdir(scenarioDir);
  const scenarios: ScenarioDefinition[] = [];

  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    const content = await readFile(path.join(scenarioDir, file), 'utf8');
    scenarios.push(parseScenario(content));
  }

  return scenarios;
}

export async function runWWWCT(options: RunnerOptions): Promise<ReportBundle> {
  const scenarios = await loadScenarios(options.scenarioDir);
  await mkdir(options.reportDir, { recursive: true });

  const results: ScenarioRunResult[] = [];
  for (const scenario of scenarios) {
    const result = await runScenario(scenario, options);
    results.push(result);
  }

  // BOLT OPTIMIZATION: Accumulate summary stats in a single O(N) loop
  // instead of multiple .filter().length and .reduce() passes
  let passedCount = 0;
  let failedCount = 0;
  let blockedCount = 0;
  let totalScore = 0;

  for (const result of results) {
    if (result.status === 'passed') passedCount++;
    else if (result.status === 'failed') failedCount++;
    else if (result.status === 'blocked') blockedCount++;

    totalScore += result.metrics.finalScore;
  }

  const summary = {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    blocked: blockedCount,
    score: results.length === 0 ? 0 : totalScore / results.length,
  };

  const report: ReportBundle = {
    summary,
    results,
    generatedAt: new Date().toISOString(),
  };

  await writeJsonReport(options.reportDir, report);
  await writeJUnitReport(options.reportDir, report);
  await writeMarkdownReport(options.reportDir, report);

  return report;
}
