<!-- VALUATION_IMPACT: Chronicles failure responses to lower operational risk discount -->
<!-- Generated: 2026-02-03 -->
# Failure Modes
| Failure Mode | Symptoms | Recovery Procedure |
| --- | --- | --- |
| Temporal cluster down | Workflows stuck, backlog spikes | Check Temporal Cloud status, fail over to backup cluster, restart workers (15 min) |
| Supabase degraded | Query timeouts, auth failures | Review status page, enable additional read replicas, bump compute tier (5 min) |
| pgvector index corrupt | Vector search fails or returns empty results | Rebuild index with `pg_repack`, verify checksums (30 min) |
| Redis cache unavailable | Latency spikes, cache miss surge | Validate ElastiCache health, restart nodes, reroute traffic (10 min) |
| Edge function cold starts | Latency >300 ms alerts | Warm functions with curl script, increase concurrency (2 min) |

# PITR Procedure
1. Open the Supabase dashboard > Database > Point-in-time recovery.
2. Select the timestamp aligned with the last verified checkpoint.
3. Execute restore and monitor completion indicator.
4. Validate data integrity via checksum query: `SELECT md5(string_agg(id::text, '')) FROM critical_table;`.

# Rollback Playbook
1. Identify the failing deployment commit.
2. Run `git revert <commit>` and push to release branch.
3. Redeploy previous version via `npm run deploy:production`.
4. Verify via smoke tests: `npm run test -- --grep smoke`.

# Verify:
markdownlint docs/sre/OPERATIONS_MANUAL.md
