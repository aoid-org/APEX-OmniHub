# Database Provider Layer — Portability & AWS Swap Runbook

This package is the **single integration port** for the orchestrator's primary
relational database. Application/activity code depends only on the
`DatabaseProvider` protocol (`base.py`) — never on a vendor SDK directly — so the
backing provider is a config flip, not a code change.

## Layout

| File | Responsibility |
|---|---|
| `base.py` | `DatabaseProvider` protocol + error types (the contract) |
| `_validation.py` | Shared SQL-injection guards: table allowlist + identifier validation (one source of truth for **every** provider) |
| `supabase_provider.py` | Managed Supabase implementation (default) |
| `postgres_provider.py` | Portable standard-Postgres implementation over `asyncpg` — the swap target |
| `factory.py` | Selects the provider from `DATABASE_PROVIDER`; singletons |

## The config-only swap (Supabase → AWS RDS / Cloud SQL / Azure / self-host)

The `postgres_provider` speaks plain Postgres over a single DSN, so the *same*
provider covers AWS RDS, GCP Cloud SQL, Azure Database, and a self-hosted
Postgres container. To cut over:

```bash
# 1. Point at the target Postgres (any wire-compatible host)
export DATABASE_PROVIDER=postgres            # or: aws / rds / postgresql
export DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME

# 2. Restart the orchestrator. No code changes, no redeploy of app logic.
```

If `DATABASE_URL` is unset, the factory falls back to `SUPABASE_DB_URL` so an
existing direct-Postgres connection string can be reused as-is.

### Data migration (when the DSN points at an empty target)

The provider swap moves *where queries go*; it does not move data. Standard
Postgres tooling handles that, vendor-neutrally:

```bash
pg_dump "$SUPABASE_DB_URL" | psql "$DATABASE_URL"   # then verify row counts
```

## Safety guarantees preserved across the swap

Both providers import the **same** `_validation.py`, so the table allowlist and
identifier validation are identical regardless of backend — a swap can never
silently widen the SQL-injection surface. The Postgres provider passes all
values as bind parameters (`$1, $2, …`); only validated identifiers are ever
interpolated.

## Rollback

```bash
export DATABASE_PROVIDER=supabase   # revert; remove/ignore DATABASE_URL
# restart orchestrator
```

## Tests

`tests/test_postgres_provider.py` verifies query construction, the validation
guards, row-count parsing, and factory selection for every alias — without a
live database (the pool is faked).

## Not yet wired (documented next steps, out of scope for this seam)

- **Auth / Storage / Realtime** still resolve to Supabase components. The
  frontend `src/lib/database` and `src/lib/storage` factories already define the
  `postgresql` / `s3` slots but throw "not implemented" — those adapters are the
  next swap targets.
- `CHRONOS_ADAPTER` (durable locks/idempotency) is a separate swappable seam.
