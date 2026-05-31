# PERFORMANCE ALCHEMIST — OMNIDEV-APEX Reference

## Activation
Triggered by: optimize, performance, slow, latency, profil, benchmark, memory leak, CPU, throughput, FinOps cost

## Law: Measure Before Optimizing (no exceptions)
```
NEVER optimize based on intuition.
ALWAYS capture baseline metric before ANY change.
ALWAYS measure again after change.
ALWAYS state improvement as a concrete delta (e.g., "p99 reduced from 450ms to 82ms").
```

## Profiling — By Language
```bash
# Node.js / TypeScript
node --cpu-prof --cpu-prof-dir=./profiles server.js
# Then: chrome://inspect → load profile

# Python
py-spy record -o profile.svg -- python app.py
# Or: python -m cProfile -o output.prof app.py

# Go
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30

# Rust
cargo flamegraph -- ./target/release/my-app

# General HTTP load test
k6 run --vus 100 --duration 30s loadtest.js
# Capture: p50, p95, p99 latency + error rate + throughput
```

## Optimization Priority Order
```
1. ALGORITHM   O(n²) → O(n log n) beats any infra spend. Check complexity first.
2. DATABASE    Indexes | query plans | N+1 elimination | connection pooling
3. CACHING     Right layer | correct TTL | eviction policy | cache stampede prevention
4. ASYNC       Parallelize safe ops | sequence ordered ops | avoid blocking I/O
5. INFRA       Scale only AFTER code is optimized — last resort, not first
```

## Database Optimization Checklist
```sql
-- 1. Check query plan BEFORE optimizing
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = $1;
-- Look for: Seq Scan on large table (bad) | Index Scan (good)

-- 2. Add index on filter/join columns
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
-- CONCURRENTLY: no table lock in production

-- 3. N+1 elimination
-- BAD: loop with query inside
-- GOOD: JOIN or batch fetch (WHERE id = ANY($1))

-- 4. Connection pooling
-- PgBouncer or Supavisor in transaction mode for serverless
-- Pool size: (core_count * 2) + effective_spindle_count
```

## Caching Strategy
```typescript
// Cache-aside pattern (most common — explicit control)
async function getUser(id: string): Promise<User> {
  const cached = await cache.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.findUser(id);
  await cache.set(`user:${id}`, JSON.stringify(user), { ttl: 300 }); // TTL always set
  return user;
}

// Cache stampede prevention (lock before set)
async function getOrCompute(key: string, computeFn: () => Promise<string>): Promise<string> {
  const cached = await cache.get(key);
  if (cached) return cached;

  const lock = await cache.acquireLock(`lock:${key}`, 5000);
  if (!lock) {
    await sleep(100);
    return getOrCompute(key, computeFn); // retry — another process computing
  }
  try {
    const value = await computeFn();
    await cache.set(key, value, { ttl: 300 });
    return value;
  } finally {
    await cache.releaseLock(`lock:${key}`);
  }
}
```

## OTel Performance Tracking
```typescript
// Every slow operation: histogram + span
const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Alert: p99 > SLO threshold
// SLO: p99 < 500ms for user-facing APIs
// SLO: p99 < 2000ms for background jobs
```

## FinOps Integration
```
Every optimization decision must quantify:
  - Cost before ($/month)
  - Cost after ($/month)
  - Performance before (p99 latency or throughput)
  - Performance after
  - ROI: (perf gain / cost delta) — optimize the ratio, not just one dimension

Right-sizing checklist:
  □ CPU: average utilization < 40%? → downsize
  □ Memory: average utilization < 50%? → downsize
  □ DB: read replicas used? → add if read:write > 80:20
  □ Cache hit rate < 80%? → investigate TTL or cache key design
```
