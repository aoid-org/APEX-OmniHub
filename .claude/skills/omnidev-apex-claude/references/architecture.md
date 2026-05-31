# ARCHITECTURE ENGINE — OMNIDEV-APEX Reference

## Activation
Triggered by: architect, design system, system design, scalability, microservices, monolith, event-driven, CQRS, event sourcing

## Extended Thinking: Mandatory for Architecture Decisions
Activate Claude extended thinking before ANY architectural output.

## ADR Template (create_file → docs/decisions/YYYY-MM-DD-title.md)
```markdown
# ADR-NNNN: Title
Date: YYYY-MM-DD
Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX

## Context
What is the exact problem being solved? What forces are in tension?

## Decision
What is the chosen approach? State it clearly.

## Options Considered
| Option | Pros | Cons | Rejected Because |
|--------|------|------|-----------------|
| A | ... | ... | ... |
| B | ... | ... | ... |
| Chosen | ... | ... | — |

## Consequences
- Positive: ...
- Negative: ...
- Risks: ... (with mitigations)

## Evolution
How does this scale at 10x? 100x? What triggers a re-evaluation?
```

## Architecture Invariants
```
RELIABILITY:   Zero single points of failure on critical paths
OBSERVABILITY: OTel on every service boundary (no dark services)
RESILIENCE:    Circuit breaker + retry (exp backoff) + dead-letter on every async op
IDEMPOTENCY:   Every mutating operation has idempotency key
PORTABILITY:   Every third-party dependency behind abstraction layer
SECURITY:      Zero-trust by default — authenticate + authorize every call
FINOPS:        Cost estimated before every infra decision
```

## Service Boundary Pattern
```typescript
// Every service boundary:
// 1. OTel span
// 2. Input validation
// 3. Circuit breaker
// 4. Retry with backoff
// 5. Timeout
// 6. Dead-letter on failure

const circuitBreaker = new CircuitBreaker(serviceCall, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  fallback: () => cachedResult ?? gracefulDegradation(),
});
```

## Scale Decision Matrix

| Scale | Pattern | Rationale |
|-------|---------|-----------|
| 0–10K RPM | Monolith + read replicas | Simplicity wins |
| 10K–100K RPM | Modular monolith + caching | Extract only bottlenecks |
| 100K–1M RPM | Selective microservices | Split by load, not by domain |
| 1M+ RPM | Event-driven + CQRS | Async decoupling required |

**Rule: Never prematurely split. Measure first. Split the bottleneck only.**

## Event-Driven Pattern
```typescript
// Event schema: versioned + typed
interface DomainEvent<T> {
  id: string;           // UUIDv7 — time-ordered
  type: string;         // 'user.created' — namespaced
  version: number;      // schema version for consumers
  occurredAt: string;   // ISO 8601
  aggregateId: string;
  payload: T;           // Zod-validated
}

// Publisher: always idempotent
async function publishEvent(event: DomainEvent<unknown>) {
  const span = tracer.startSpan('event.publish', {
    attributes: { 'event.type': event.type, 'event.id': event.id }
  });
  try {
    await outbox.save(event); // transactional outbox pattern
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (err) {
    span.recordException(err as Error);
    throw err;
  } finally { span.end(); }
}
```
