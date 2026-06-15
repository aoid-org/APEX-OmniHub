/**
 * MAESTRO Execution Engine
 * Validates and executes intents with risk-based routing
 */

import type {
  MaestroIntent,
  ValidationResult,
  ExecutionResult,
  RiskLane,
  MANModeRequest,
  MANModeResponse,
} from '../types';
import {
  ALLOWLISTED_ACTIONS,
  BCP47_PATTERN,
  IDEMPOTENCY_KEY_PATTERN,
} from '../types';
import { detectInjection } from '../safety/injection-detection';
import { logRiskEvent } from '../safety/risk-events';
import { assessTaskStakes } from '../../../core/gateway/TaskComplexityScorer';
import { routeToSolvers } from '../../../omnihub-gateway/SemanticRouter';
import { TreeSearchPlanner } from './TreeSearchPlanner';
import type { Task as PlannerTask } from './TreeSearchPlanner';

// Module-level singleton — one planner shared across all intent executions
const treePlanner = new TreeSearchPlanner();

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ExecutionOptions {
  baseUrl?: string;
  fetchFn?: FetchFn;
}

/**
 * Resolve the full execute URL from options, environment, or browser same-origin.
 * Resolution order:
 *   a. options.baseUrl
 *   b. NEXT_PUBLIC_ORCHESTRATOR_BASE_URL | VITE_ORCHESTRATOR_BASE_URL | ORCHESTRATOR_BASE_URL
 *   c. browser same-origin /api/maestro/execute
 *   d. throw — no localhost fallback allowed in server/test paths
 */
function resolveExecuteUrl(options: ExecutionOptions): string {
  const EXECUTE_PATH = '/api/maestro/execute';

  if (options.baseUrl) {
    return options.baseUrl.replace(/\/+$/, '') + EXECUTE_PATH; // NOSONAR
  }

  const envBase =
    (typeof process !== 'undefined' &&
      (process.env['NEXT_PUBLIC_ORCHESTRATOR_BASE_URL'] ||
        process.env['VITE_ORCHESTRATOR_BASE_URL'] ||
        process.env['ORCHESTRATOR_BASE_URL'])) ||
    '';

  if (envBase) {
    return envBase.replace(/\/+$/, '') + EXECUTE_PATH; // NOSONAR
  }

  if (typeof window !== 'undefined') { // NOSONAR
    return EXECUTE_PATH;
  }

  throw new Error('MAESTRO orchestrator base URL is not configured');
}

// Custom action registry
const customActions = new Set<string>();

/**
 * Check if an action is allowlisted
 */
export function isActionAllowlisted(action: string): boolean {
  return (
    (ALLOWLISTED_ACTIONS as readonly string[]).includes(action) ||
    customActions.has(action)
  );
}

/**
 * Register a custom action as allowlisted
 */
export function registerCustomAction(action: string): void {
  customActions.add(action);
}

/**
 * Clear custom actions (for testing)
 */
export function clearCustomActions(): void {
  customActions.clear();
}

/**
 * Validate an intent for execution
 */
export async function validateIntent(
  intent: MaestroIntent
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let riskLane: RiskLane = 'GREEN';

  // Schema validation - idempotency_key format
  if (!intent.idempotency_key || !IDEMPOTENCY_KEY_PATTERN.test(intent.idempotency_key)) {
    errors.push('Schema validation failed: /idempotency_key must match pattern "^[a-f0-9]{64}$"');
    riskLane = 'RED';
  }

  // Validate identity fields
  if (!intent.identity?.tenant_id || !intent.identity?.user_id || !intent.identity?.session_id) {
    errors.push('Missing required identity fields');
    riskLane = 'RED';
  }

  // Validate locale format (BCP-47)
  if (intent.identity?.locale && !BCP47_PATTERN.test(intent.identity.locale)) {
    errors.push('Invalid locale format - must be BCP-47 compliant');
    riskLane = 'RED';
  }

  // Validate confidence range
  if (intent.confidence < 0 || intent.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
    riskLane = 'RED';
  }

  // Check action allowlist
  if (!isActionAllowlisted(intent.action)) {
    errors.push(`Action '${intent.action}' is not allowlisted`);
    riskLane = 'RED';

    await logRiskEvent({
      event_type: 'execution_blocked',
      risk_lane: 'RED',
      tenant_id: intent.identity?.tenant_id || 'unknown',
      details: { reason: 'Action not allowlisted' },
      blocked_action: intent.action,
      trace_id: intent.intent_id,
    });
  }

  // Check for injection in parameters
  const paramString = JSON.stringify(intent.parameters);
  const injectionResult = detectInjection(paramString);

  if (injectionResult.blocked) {
    errors.push('Potential injection detected in parameters');
    riskLane = 'RED';

    await logRiskEvent({
      event_type: 'injection_attempt',
      risk_lane: 'RED',
      tenant_id: intent.identity?.tenant_id || 'unknown',
      details: {
        input_preview: paramString.slice(0, 100),
        patterns_matched: injectionResult.patterns_matched,
        risk_score: injectionResult.risk_score,
        blocked: true,
      },
      blocked_action: intent.action,
      trace_id: intent.intent_id,
    });
  } else if (injectionResult.detected) {
    warnings.push(...injectionResult.warnings);
    if (riskLane === 'GREEN') {
      riskLane = 'YELLOW';
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    risk_lane: riskLane,
  };
}

/**
 * Execute a validated intent.
 *
 * Pipeline:
 *   1. Pre-compute routing (assessTaskStakes + routeToSolvers) — before validation
 *   2. Tree-search planning for high-stakes tasks (reasoning_budget ≥ 1000)
 *   3. Standard MAESTRO validation + risk-lane gating
 *   4. performAction — routing metadata surfaced in outcome._routing
 */
export async function executeIntent(
  intent: MaestroIntent,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  // ── Pre-Compute Routing Layer ─────────────────────────────────────────────
  // Must run before the execution loop so the budget is in scope for all
  // downstream branching decisions.
  const stakes = assessTaskStakes(intent.action);
  const solverPayload = routeToSolvers(intent.action);

  // Tree-search planning for logic/architecture tier tasks
  let routingStrategy: string = 'direct';
  if (stakes.reasoning_budget >= 1000) {
    const plannerTask: PlannerTask = {
      id: intent.intent_id,
      intent: intent.action,
      reasoning_budget: stakes.reasoning_budget,
      context: intent.parameters,
    };
    const planned = treePlanner.plan(plannerTask);
    routingStrategy = planned.route.strategy;
  }

  // ── MAESTRO Validation ────────────────────────────────────────────────────
  const validation = await validateIntent(intent);

  if (!validation.valid) {
    return {
      success: false,
      intent_id: intent.intent_id,
      error: validation.errors.join('; '),
      blocked: validation.risk_lane === 'RED',
      risk_lane: validation.risk_lane,
    };
  }

  // Check translation status
  if (intent.translation_status === 'FAILED') {
    return {
      success: false,
      intent_id: intent.intent_id,
      error: 'Translation failed',
      blocked: true,
      risk_lane: 'RED',
    };
  }

  // Check user confirmation for high-risk actions
  if (!intent.user_confirmed && validation.risk_lane === 'YELLOW') {
    return {
      success: false,
      intent_id: intent.intent_id,
      error: 'User confirmation required for this action',
      blocked: false,
      risk_lane: 'YELLOW',
    };
  }

  // Check confidence threshold
  if (intent.confidence < 0.7) {
    return {
      success: false,
      intent_id: intent.intent_id,
      error: 'Confidence below threshold',
      blocked: true,
      risk_lane: 'RED',
    };
  }

  // ── Execution ─────────────────────────────────────────────────────────────
  try {
    const outcome = await performAction(intent, options);
    return {
      success: true,
      intent_id: intent.intent_id,
      outcome: {
        ...outcome,
        _routing: {
          stakes_level: stakes.stakes_level,
          reasoning_budget: stakes.reasoning_budget,
          solvers: solverPayload.solvers,
          tools: solverPayload.tools,
          strategy: routingStrategy,
        },
      },
      risk_lane: validation.risk_lane,
    };
  } catch (error) {
    return {
      success: false,
      intent_id: intent.intent_id,
      error: error instanceof Error ? error.message : 'Unknown error',
      risk_lane: validation.risk_lane,
    };
  }
}

/**
 * Execute a batch of intents, stopping on RED lane detection
 */
export async function executeBatch(
  intents: MaestroIntent[],
  options: ExecutionOptions = {}
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  // Check for duplicate idempotency keys
  const keys = new Set<string>();
  for (const intent of intents) {
    if (keys.has(intent.idempotency_key)) {
      throw new Error(`Duplicate idempotency key: ${intent.idempotency_key}`);
    }
    keys.add(intent.idempotency_key);
  }

  for (const intent of intents) {
    const result = await executeIntent(intent, options);
    results.push(result);

    // Stop batch on RED lane
    if (result.risk_lane === 'RED' && result.blocked) {
      break;
    }
  }

  return results;
}

/**
 * Request MAN (Manual Approval Needed) mode escalation
 */
export async function requestMANMode(
  request: MANModeRequest
): Promise<MANModeResponse> {
  console.warn('[MAESTRO] Escalating to MAN mode:', request.reason, {
    intent: request.intent.intent_id,
  });

  // In a real implementation, this would notify human operators
  // For now, we simulate a rejection for testing
  return {
    approved: false,
    notes: 'MAN mode escalation simulated - requires Manual Approval Node approval',
  };
}

/**
 * Perform the actual action — throws on transport failure or non-OK HTTP response.
 */
async function performAction(
  intent: MaestroIntent,
  options: ExecutionOptions
): Promise<Record<string, unknown>> {
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  const url = resolveExecuteUrl(options);

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: intent.action,
        params: intent.parameters,
        idempotency_key: intent.idempotency_key,
      }),
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  if (!response.ok) {
    throw new Error(`HTTP status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}
