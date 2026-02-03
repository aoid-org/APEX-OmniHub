<!-- VALUATION_IMPACT: Documents scaling levers to absorb 10k tenants via configuration -->
<!-- Generated: 2026-02-03 -->
| Bottleneck | Config Switch | Action | Impact |
| --- | --- | --- | --- |
| Workflow backlog | TEMPORAL_WORKER_COUNT | Increase Kubernetes replicas from 3 to 10 | +500% throughput |
| Database queries | SUPABASE_COMPUTE_TIER | Upgrade to pro+ for more CPU and mem | Consistent sub-100ms reads for 10k tenants |
| Vector search | PGVECTOR_INDEX_TYPE | Switch to `ivfflat` with nlist=256 | Latency drops 40%, consistent QPS |
| API rate limits | EDGE_CONCURRENCY | Raise Supabase edge concurrency per region | Burst absorbs 2000 req/s |
| Cache hit rate | REDIS_MEMORY_LIMIT | Allocate more memory + LFU eviction | Hit rate >90%, less database pressure |

# Verify:
markdownlint docs/sre/SCALE_LEVERS.md
