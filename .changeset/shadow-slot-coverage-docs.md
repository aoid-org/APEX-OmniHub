---
"apex-omnihub": patch
---

Provision Cloudflare Pages shadow deployment slot, raise vitest coverage thresholds, and canonicalise omega/orchestrator topology in architecture docs.

- Creates `apex-omnihub-shadow` Cloudflare Pages project (unblocks certification blocker B-1)
- Raises vitest branch coverage threshold 60→63 with north-star comment targeting 75%
- Documents `omega/` (APEX Resilience Protocol) runtime boundary in ARCHITECTURE_CANONICAL_MAP.md and CLAUDE.md
- Adds unambiguous disambiguation table for `orchestrator/`, `services/orchestrator/`, `omega/`, `src/core/orchestrator/`, and `src/omnihub-gateway/`
