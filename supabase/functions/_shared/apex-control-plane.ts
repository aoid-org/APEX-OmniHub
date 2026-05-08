export {
  APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION,
  APEX_POLICY_VERSION,
  assertMutationEnvelope,
  continueTraceContext,
  createExecutionEnvelope,
  deriveIntentHash,
  evaluateGuardianPolicy,
  injectTraceHeaders,
  parseExecutionEnvelope,
  parseTraceContext,
  structuredApexLogFields,
} from '../../../src/lib/apex/control-plane.ts';
export type {
  ApexDecision,
  ApexEnvelopeInput,
  ApexExecutionEnvelope,
  ApexOutcomeKind,
  ApexPolicyDecisionRecord,
  ApexPolicyRule,
  ApexTraceContext,
} from '../../../src/lib/apex/control-plane.ts';
