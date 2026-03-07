/**
 * Gateway — Barrel Export
 * @module src/core/gateway
 *
 * Re-exports OmniRoute routing infrastructure alongside existing
 * ApexRealtimeGateway. All gateway exports accessible from '@/core/gateway'.
 */

export {
  routeTask,
  routeTasks,
  summarizeDecision,
  RouteDecisionSchema,
  type RouteDecision,
} from './OmniRoute';

export {
  scoreTask,
  TaskScoreResultSchema,
  type TaskScoreResult,
  type RouteTarget,
  type TaskDomain,
} from './TaskComplexityScorer';

export {
  getModelCapability,
  getAllModels,
  validateRouteDecision,
  estimateCost,
  ModelCapabilitySchema,
  type ModelCapability,
} from './ModelRegistry';

export {
  evaluatePolicy,
  DEFAULT_POLICY_RULES,
  RoutingRuleSchema,
  RoutePolicyConfigSchema,
  type RoutingRule,
  type RoutePolicyConfig,
  type PolicyOverride,
} from './RoutePolicy';
