# Documentation Drift Matrix

| Topic | Canonical Truth | Conflicting File(s) | Issue Type | Exact Fix Made | Disposition |
| --- | --- | --- | --- | --- | --- |
| **Package Manager Authority** | `npm` is authoritative for CI/releases (`package-lock.json`), Node 24 is target. `bun` is optional/local. | `CLAUDE.md`, `docs/architecture/CANONICAL_TRUTH.md`, `docs/onboarding/DEVELOPER_ONBOARDING.md` | Authority Contradiction | Updated onboarding commands to use `npm`, clarified `bun` is optional local-only in `CLAUDE.md` and `CANONICAL_TRUTH.md`. | Corrected |
| **Hosting Target** | Cloudflare Pages is the canonical web runtime & edge compute platform. | `README.md`, `docs/project-status/PRODUCTION_STATUS.md` | Legacy State | Marked Vercel Edge proxy mentions as historical / legacy. | Corrected / Marked historical |
| **Local Setup Truth** | One command `docker compose -f docker-compose.dev.yml up` starts frontend + Temporal + Redis. | `README.md` | Minor Error | None. Checked and verified to be correct. | Flagged but intentionally untouched |
| **Production Status Framing** | OmniHub uses cloud Supabase, Cloudflare Pages, Temporal. | `docs/project-status/PRODUCTION_STATUS.md` | Legacy State | Updated to clearly frame Vercel elements as historical artifacts superseded by Cloudflare Pages. | Corrected |
