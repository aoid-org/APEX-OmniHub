# TEMPORAL PATTERNS — OMNIDEV-APEX Reference

## Saga Pattern (every distributed transaction)
```typescript
interface SagaStep<T> {
  id: string;                              // unique idempotency key
  execute: (ctx: T) => Promise<void>;
  compensate: (ctx: T) => Promise<void>;  // always defined — no partial sagas
}

class SagaOrchestrator<T> {
  private completed: SagaStep<T>[] = [];

  async run(steps: SagaStep<T>[], ctx: T): Promise<void> {
    for (const step of steps) {
      try {
        await this.idempotentExecute(step.id, () => step.execute(ctx));
        this.completed.push(step);
      } catch (err) {
        // Compensate in reverse order
        for (const done of [...this.completed].reverse()) {
          await done.compensate(ctx).catch(e =>
            log.error('Compensation failed', { stepId: done.id, err: e })
          );
        }
        throw new SagaFailedError(step.id, err);
      }
    }
  }

  private async idempotentExecute(key: string, fn: () => Promise<void>) {
    const existing = await store.get(`saga:${key}`);
    if (existing === 'done') return; // already executed — skip
    await fn();
    await store.set(`saga:${key}`, 'done', { ttl: 86400 }); // 24h TTL
  }
}
```

## Idempotency Pattern
```typescript
// Every mutating API endpoint: idempotency key required
async function idempotentHandler(
  idempotencyKey: string,
  fn: () => Promise<Result>
): Promise<Result> {
  // 1. Check for existing result
  const cached = await store.get(`idem:${idempotencyKey}`);
  if (cached) return JSON.parse(cached) as Result;

  // 2. Acquire lock to prevent concurrent duplicate execution
  const lock = await store.acquireLock(`lock:idem:${idempotencyKey}`, 30_000);
  if (!lock) throw new ConflictError('Request in progress');

  try {
    // 3. Double-check after lock
    const rechecked = await store.get(`idem:${idempotencyKey}`);
    if (rechecked) return JSON.parse(rechecked) as Result;

    // 4. Execute
    const result = await fn();

    // 5. Persist result (TTL always set — never permanent)
    await store.set(`idem:${idempotencyKey}`, JSON.stringify(result), { ttl: 86400 });
    return result;
  } finally {
    await store.releaseLock(`lock:idem:${idempotencyKey}`);
  }
}
```

## Outbox Pattern (guaranteed event delivery)
```typescript
// Transactional outbox: save event in same DB tx as business data
async function createOrderWithEvent(order: Order, db: Tx) {
  await db.transaction(async (tx) => {
    await tx.orders.insert(order);
    await tx.outbox.insert({  // same transaction — atomic
      id: uuidv7(),
      eventType: 'order.created',
      payload: JSON.stringify(order),
      createdAt: new Date(),
      processedAt: null,
    });
  });
  // Separate relay process polls outbox and publishes to message broker
}
```
