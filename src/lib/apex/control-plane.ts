export const APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION = 'apex.envelope.v1' as const;
export const APEX_POLICY_VERSION = 'apex.policy.v1' as const;

export type ApexDecision = 'allow' | 'deny';
export type ApexOutcomeKind = 'accepted' | 'duplicate' | 'stale' | 'compensated' | 'rejected';

export interface ApexExecutionEnvelope {
  trace_id: string;
  correlation_id: string;
  idempotency_key: string;
  intent_hash: string;
  attempt: number;
  stale_after: string;
  actor_id: string;
  device_id: string;
  policy_version: string;
  compensation_ref: string | null;
  schema_version: typeof APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION;
}

export interface ApexEnvelopeInput {
  actor_id: string;
  device_id: string;
  action: string;
  resource: string;
  payload?: unknown;
  stale_after: string | Date;
  attempt?: number;
  trace_id?: string;
  correlation_id?: string;
  policy_version?: string;
  compensation_ref?: string | null;
}

export interface ApexPolicyDecisionRecord {
  principal: string;
  action: string;
  resource: string;
  context: Record<string, unknown>;
  decision: ApexDecision;
  determining_policy_id: string;
  reason_code: string;
  policy_version: string;
  trace_id: string;
  correlation_id: string;
  created_at: string;
}

export interface ApexPolicyRule {
  id: string;
  effect: ApexDecision;
  reason_code: string;
  policy_version: string;
  actions?: readonly string[];
  resources?: readonly string[];
  required_context?: readonly string[];
  allowed_device_ids?: readonly string[];
}

export interface ApexTraceContext {
  traceparent: string;
  tracestate?: string;
  trace_id: string;
  parent_id: string;
}

const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  const serializedEntries = entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(',');
  return `{${serializedEntries}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes: number): string {
  const data = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(data);
  return [...data].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function parseTraceContext(headers: Headers | Record<string, string | undefined>): ApexTraceContext | null {
  const get = headers instanceof Headers ? (key: string) => headers.get(key) ?? undefined : (key: string) => headers[key];
  const traceparent = get('traceparent');
  if (!traceparent) return null;
  const match = TRACEPARENT_RE.exec(traceparent);
  if (!match || match[1] === '0'.repeat(32) || match[2] === '0'.repeat(16)) return null;
  return { traceparent, tracestate: get('tracestate'), trace_id: match[1], parent_id: match[2] };
}

export function continueTraceContext(existing?: ApexTraceContext | null): ApexTraceContext {
  const trace_id = existing?.trace_id ?? randomHex(16);
  const parent_id = randomHex(8);
  return { trace_id, parent_id, tracestate: existing?.tracestate, traceparent: `00-${trace_id}-${parent_id}-01` };
}

export function injectTraceHeaders(headers: Headers, trace: ApexTraceContext): Headers {
  headers.set('traceparent', trace.traceparent);
  if (trace.tracestate) headers.set('tracestate', trace.tracestate);
  return headers;
}

export async function deriveIntentHash(input: Pick<ApexEnvelopeInput, 'actor_id' | 'device_id' | 'action' | 'resource' | 'payload'>): Promise<string> {
  return sha256Hex(canonicalize({ actor_id: input.actor_id, device_id: input.device_id, action: input.action, resource: input.resource, payload: input.payload ?? null }));
}

export async function createExecutionEnvelope(input: ApexEnvelopeInput): Promise<ApexExecutionEnvelope> {
  const staleAfter = input.stale_after instanceof Date ? input.stale_after.toISOString() : input.stale_after;
  const intentHash = await deriveIntentHash(input);
  const correlationSeed = await sha256Hex(canonicalize({ actor_id: input.actor_id, action: input.action, resource: input.resource, intent_hash: intentHash }));
  return {
    trace_id: input.trace_id ?? randomHex(16),
    correlation_id: input.correlation_id ?? `apex-corr-${correlationSeed.slice(0, 32)}`,
    idempotency_key: `apex-idem-${intentHash.slice(0, 48)}`,
    intent_hash: intentHash,
    attempt: input.attempt ?? 1,
    stale_after: staleAfter,
    actor_id: input.actor_id,
    device_id: input.device_id,
    policy_version: input.policy_version ?? APEX_POLICY_VERSION,
    compensation_ref: input.compensation_ref ?? null,
    schema_version: APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION,
  };
}

export function parseExecutionEnvelope(value: unknown): ApexExecutionEnvelope {
  if (!value || typeof value !== 'object') throw new Error('apex_envelope_missing');
  const envelope = value as Record<string, unknown>;
  const required = ['trace_id', 'correlation_id', 'idempotency_key', 'intent_hash', 'stale_after', 'actor_id', 'device_id', 'policy_version', 'schema_version'];
  for (const field of required) {
    if (typeof envelope[field] !== 'string' || envelope[field] === '') throw new Error(`apex_envelope_invalid_${field}`);
  }
  if (typeof envelope.attempt !== 'number' || envelope.attempt < 1) throw new Error('apex_envelope_invalid_attempt');
  if (envelope.schema_version !== APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION) throw new Error('apex_envelope_schema_version_unsupported');

  const readRequiredString = (field: string): string => {
    const item = envelope[field];
    if (typeof item !== 'string' || item === '') throw new Error(`apex_envelope_invalid_${field}`);
    return item;
  };

  // Return an explicit envelope so runtime validation and TypeScript narrowing stay aligned.
  return {
    trace_id: readRequiredString('trace_id'),
    correlation_id: readRequiredString('correlation_id'),
    idempotency_key: readRequiredString('idempotency_key'),
    intent_hash: readRequiredString('intent_hash'),
    attempt: envelope.attempt,
    stale_after: readRequiredString('stale_after'),
    actor_id: readRequiredString('actor_id'),
    device_id: readRequiredString('device_id'),
    policy_version: readRequiredString('policy_version'),
    compensation_ref: typeof envelope.compensation_ref === 'string' ? envelope.compensation_ref : null,
    schema_version: APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION,
  };
}

export function assertMutationEnvelope(method: string, envelope: unknown, now: Date = new Date()): ApexExecutionEnvelope | null {
  if (!MUTATING_METHODS.has(method.toUpperCase())) return null;
  const parsed = parseExecutionEnvelope(envelope);
  const staleAt = Date.parse(parsed.stale_after);
  if (!Number.isFinite(staleAt)) throw new Error('apex_envelope_invalid_stale_after');
  if (staleAt <= now.getTime()) throw new Error('apex_stale_event');
  return parsed;
}

export function evaluateGuardianPolicy(args: {
  principal: string;
  action: string;
  resource: string;
  context: Record<string, unknown>;
  envelope: ApexExecutionEnvelope;
  rules: readonly ApexPolicyRule[];
  current_policy_version?: string;
  now?: Date;
}): ApexPolicyDecisionRecord {
  const now = args.now ?? new Date();
  const staleAt = Date.parse(args.envelope.stale_after);
  const base = { principal: args.principal, action: args.action, resource: args.resource, context: args.context, trace_id: args.envelope.trace_id, correlation_id: args.envelope.correlation_id, created_at: now.toISOString() };
  if (args.current_policy_version && args.envelope.policy_version !== args.current_policy_version) {
    return { ...base, decision: 'deny', determining_policy_id: 'apex.guardian.stale_policy_version', reason_code: 'STALE_POLICY_VERSION', policy_version: args.current_policy_version };
  }
  if (staleAt <= now.getTime()) return { ...base, decision: 'deny', determining_policy_id: 'apex.guardian.stale_event', reason_code: 'STALE_EVENT', policy_version: args.envelope.policy_version };
  const ordered = [...args.rules].sort((a, b) => a.id.localeCompare(b.id));
  for (const rule of ordered) {
    if (rule.actions && !rule.actions.includes(args.action)) continue;
    if (rule.resources && !rule.resources.includes(args.resource)) continue;
    if (rule.required_context?.some((key) => args.context[key] === undefined || args.context[key] === null)) {
      return { ...base, decision: 'deny', determining_policy_id: rule.id, reason_code: 'MISSING_CONTEXT', policy_version: rule.policy_version };
    }
    if (rule.allowed_device_ids && !rule.allowed_device_ids.includes(args.envelope.device_id)) {
      return { ...base, decision: 'deny', determining_policy_id: rule.id, reason_code: 'WRONG_DEVICE', policy_version: rule.policy_version };
    }
    return { ...base, decision: rule.effect, determining_policy_id: rule.id, reason_code: rule.reason_code, policy_version: rule.policy_version };
  }
  return { ...base, decision: 'deny', determining_policy_id: 'apex.guardian.default_deny', reason_code: 'NO_MATCHING_POLICY', policy_version: args.envelope.policy_version };
}

export function structuredApexLogFields(envelope: ApexExecutionEnvelope, outcome: ApexOutcomeKind, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { trace_id: envelope.trace_id, correlation_id: envelope.correlation_id, idempotency_key: envelope.idempotency_key, intent_hash: envelope.intent_hash, actor_id: envelope.actor_id, device_id: envelope.device_id, policy_version: envelope.policy_version, compensation_ref: envelope.compensation_ref, outcome, ...extra };
}
