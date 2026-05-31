# CHAOS SOVEREIGN — OMNIDEV-APEX Reference

## Feature Flag Protocol
```
DEFINE:   Register flag in config system (LaunchDarkly/Unleash/env) BEFORE code ships
DEFAULT:  Always OFF for risk > low — never ship a new flag defaulting ON in prod
ROLLOUT:  1% → 5min validate → 10% → 5min validate → 50% → 5min validate → 100%
KILL:     One-click disable via config — no deployment required
CLEANUP:  Flag removed in code within 2 sprints of 100% rollout (tech debt timer set)
```

## Feature Flag Code Pattern
```typescript
// Abstract the flag — never use provider SDK directly in business logic
interface FeatureFlags {
  isEnabled(flag: string, context?: FlagContext): Promise<boolean>;
}

// Usage: always async, always with fallback
async function processPayment(payment: Payment) {
  const useNewProcessor = await flags.isEnabled('new-payment-processor', {
    userId: payment.userId,
    tenantId: payment.tenantId,
  });

  if (useNewProcessor) {
    return newProcessor.process(payment); // new path
  }
  return legacyProcessor.process(payment); // safe default
}
```

## Chaos Test Invariants
```
Service down:        System degrades gracefully — no cascading failure
                     Circuit breaker trips → fallback activated
Network partition:   Operations queue or fail-closed — never corrupt data
High load:           Backpressure applied — rate limiter + queue depth limit
Clock skew:          Idempotency keys time-independent (UUIDv7 or app-level seq)
Dependency timeout:  Timeout → retry (exp backoff) → DLQ — never infinite wait
Memory pressure:     OOM kill → graceful shutdown hook runs → no data loss
```

## Circuit Breaker Pattern
```typescript
const breaker = new CircuitBreaker(externalServiceCall, {
  timeout: 3_000,                    // fail after 3s — never hang
  errorThresholdPercentage: 50,      // open at 50% error rate
  resetTimeout: 30_000,              // half-open after 30s
  volumeThreshold: 10,               // minimum calls before evaluation
  fallback: async () => {
    return cachedResult              // serve stale cache
      ?? { status: 'degraded', data: [] }; // graceful degradation
  },
});
```

## Rollback Protocol
```
Every deploy: rollback script written BEFORE deploy begins

# Kubernetes: instant rollback
kubectl rollout undo deployment/my-service -n production

# Database: migration must be reversible
# DOWN migration written alongside every UP migration
# Test DOWN migration in staging before UP runs in prod

# Feature flag: instant kill
await flags.disable('new-payment-processor'); // no deploy

# Data: immutable events (event sourcing) → replay to any point
```
