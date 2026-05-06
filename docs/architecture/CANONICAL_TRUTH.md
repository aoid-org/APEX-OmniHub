# Canonical Truth File — Platform Topology & Deployment

**Version:** 1.0.0
**Last Updated:** 2026-04-26
**Owner:** Platform Architecture

## Source of Truth Statements

1. Frontend runtime is React 18.3.1 + Vite 7.
2. `src/App.tsx` is a shim that re-exports `apps/omnihub-site/src/App.tsx`.
3. Supabase Edge Functions under `supabase/functions/` are the canonical edge API layer.
4. Orchestrator runtime boundary: `orchestrator/main.py` (worker) vs `orchestrator/server.py` (API).
5. CI authority for gates: `.github/workflows/ci-runtime-gates.yml`.
6. Current production web deployment topology is Cloudflare Pages aligned.

## Conflict Resolution Rule

If any other document conflicts with this file, this file wins unless explicitly superseded by a newer dated canonical file.

