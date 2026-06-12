---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# API Versioning Policy

Version: 1.0.0
Owner: Architecture
Applies To: every HTTP API, gRPC service, GraphQL schema, event schema, webhook, SDK

---

## Scheme

- HTTP REST: `/{namespace}/v{MAJOR}/{resource}` — `v1`, `v2`, etc.
- gRPC: package version in proto `package apex.identity.v1;`
- GraphQL: single endpoint, schema evolves additively; breaking changes ship as new types or new endpoint.
- Events / queues: `topic.name.v1`. New shape = new topic version, not in-place rewrite.
- SDKs: semver. Breaking change = MAJOR bump.

## Breaking vs Non-Breaking

| Change | Type | Action |
|---|---|---|
| Add optional field | Non-breaking | ship |
| Add required field | Breaking | new version |
| Remove field | Breaking | deprecation cycle (see `DEPRECATION_POLICY.md`) |
| Change field type | Breaking | new version |
| Rename field | Breaking | new version (add new alongside, deprecate old) |
| Tighten validation | Breaking | new version |
| Loosen validation | Non-breaking but RFC required for security review |
| Change error code semantics | Breaking | new version |

## Required Per Endpoint

- documented contract (OpenAPI / proto / GraphQL SDL committed to repo)
- explicit version
- declared deprecation status
- declared rate limit
- declared authz scope
- declared idempotency key requirement (mutating endpoints)
- example request / response in docs

## Mutating Endpoint Requirements

- Idempotency key support: header `Idempotency-Key: <uuid>` honored for at least 24 hours.
- Replay-safe: same key + same body = same response, no duplicate side effect.
- Audit event emitted on success and on failure.

## Webhook Requirements

- signed (HMAC-SHA256) with rotation
- retry with exponential backoff, max 24 h
- consumer endpoints must return 2xx within 10 s
- delivery log retained 90 days

## Forbidden

- query-string versioning (`?v=2`)
- per-tenant API shapes
- silent contract changes
- mutating endpoints without idempotency key support
- breaking change inside an existing major version
