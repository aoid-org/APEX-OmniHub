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
  routeRequest,
  summarizeDecision,
  RouteDecisionSchema,
  type RouteDecision,
  type RoutedRequest,
} from './OmniRoute';

export {
  routeSolver,
  summarizeSolverDecision,
  SolverDecisionSchema,
  SolverSignalSchema,
  type SolverDecision,
  type SolverSignal,
  type SolverClass,
} from './SolverRouter';

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

export {
  MCP_PROTOCOL_VERSION,
  MCP_LEGACY_PROTOCOL_VERSION,
  SUPPORTED_MCP_PROTOCOL_VERSIONS,
  buildMcpInitializeResult,
  deriveTraceMeta,
  negotiateMcpProtocolVersion,
  paginateMcpList,
  unwrapMcpListResult,
  wrapMcpListResult,
  type MCPInitializeResult,
  type MCPListParams,
  type MCPListKind,
  type MCPPromptContract,
  type MCPResourceContract,
  type MCPToolContract,
  type PaginatedList,
  type PaginatedMCPList,
} from './ProtocolContracts';
