---
name: omnidev-apex-pro
description: APEX-OmniHub platform dev and debug agent skill. Use when developing, debugging, restoring, repairing, replicating, scaling, or optimizing any component of APEX-OmniHub—from Supabase schema to Cloudflare Workers to edge functions. Connects to the apex-omnihub-connector MCP immediately for full live platform access with recursive self-repair and zero-trust guard gates. Does not cover non-OmniHub products or general coding outside the OmniHub codebase.
license: Proprietary - APEX Business Systems Ltd.
---

# OMNIDEV-APEX-PRO
**APEX-OmniHub Platform Dev / Debug Agent — v1.0.0**

**Input**: Any APEX-OmniHub task — dev, debug, restore, repair, replicate, scale, expand, optimize, enhance, secure.
**Output**: Surgical fix, verified build, audit report, or deploy confirmation — always paired with health-gate proof.
**Success**: `apex_platform_health` returns healthy; target tests green; zero new P0/P1 error-log entries after fix.
**Fails when**: `apex-omnihub-connector` MCP not connected; STEP 0 skipped; health gate not run post-fix.

---

## STEP 0 — MANDATORY ACTIVATION

Run these three MCP calls before any other action on every task — do not skip:

```
apex_platform_health   → full health snapshot
apex_module_states     → Guardian / Planner / Executor status
apex_mcp_status        → gateway liveness + active session count
```

Lock scope immediately after:

```
GOAL:   [one sentence describing the task]
LAYER:  [db | edge | cf | frontend | ci | security | unknown]
STAKES: [low | med | high | crit]
```

---

## DOMAIN ROUTER

| Domain | MCP Calls | Detail Ref |
|--------|-----------|------------|
| Database / Schema | apex_db_query · apex_db_schema · apex_db_rls_check | platform-map §DB |
| Edge Functions | apex_edge_list · apex_edge_invoke | platform-map §EDGE |
| Cloudflare Workers | apex_cf_deployment | platform-map §CF |
| GitHub / CI | apex_gh_workflows · apex_gh_pr_status · apex_gh_commits · apex_gh_file | platform-map §CI |
| Frontend / React | apex_gh_file [src/] · apex_gh_dir | platform-map §FRONT |
| Audit / Security | apex_audit_log · apex_error_log · apex_db_rls_check | zero-trust |
| Monitoring | apex_platform_health · apex_dashboard_kpis · apex_realtime_poll | platform-map §MON |
| Unknown scope | apex_mcp_help → apex_gh_dir [/] → route above | platform-map §NAV |

Full paths, naming conventions, module connections: `references/platform-map.md`.

---

## CONTEXT HARVEST

Pull only the active domain's data — never load all refs at once:

```
Debug  → apex_error_log [severity:error] + apex_gh_file [failing file]
Build  → apex_gh_dir [target path] + apex_db_schema [affected tables]
Deploy → apex_cf_deployment + apex_gh_workflows
Audit  → apex_audit_log + apex_db_rls_check [table]
Unknown → apex_mcp_help → identify domain → route above
```

---

## RSI ENGINE — RECURSIVE SELF-REPAIR

Full protocol: `references/rsi-engine.md`. Fast-path decision tree:

```
SIGNAL (test fail · error spike · health degrade · CI fail)
├─ P0 prod down      → CRIT-MODE: apex_error_log + apex_platform_health immediately
├─ P1 data-loss risk → SURGICAL: isolate → read source → patch → verify
├─ P2 degraded       → ROOT-CAUSE: trace → hypothesize → fix → test
└─ P3 warning/drift  → QUEUE: document + schedule, no immediate action
```

Repair loop (apply in order, no skipping):

```
Attempt 1: blast_radius = 1 function or 1 file — no wider
Attempt 2: same root cause, different approach
Attempt 3: HARD STOP → load references/rsi-engine.md §ESCALATION
After any fix: 3-line postmortem → apex_audit_log
```

Health gate — mandatory after every fix, no exceptions:

```
apex_platform_health → must return healthy
apex_module_states   → all Tri-Force modules active
apex_error_log       → zero new P0/P1 entries since fix timestamp
```

---

## ZERO-TRUST GUARD GATES

Full ruleset: `references/zero-trust.md`. Inline hard stops:

```
BEFORE ANY WRITE OP
├─ apex_db_rls_check → RLS active on ALL affected tables (HARD STOP if not)
├─ No service-role key in client-side code
├─ Additive migrations only — destructive = HARD STOP without written approval
└─ Health gate must pass before writing to any production table
```

Credential exposure — any key or token found in `apex_gh_file` response:

```
→ HARD STOP immediately
→ Emit: SECURITY_FLAG: credential at [path:line]
→ Revoke: github.com/settings/tokens (PAT)
         supabase.com/dashboard/project/[id]/settings/api (Supabase)
         dash.cloudflare.com/profile/api-tokens (Cloudflare)
→ Never use the credential; await rotation confirmation
```

Non-negotiable stops — no override, no exception, no rationalization:

```
RLS disabled on users / clients / payments table
Service-role key in any client bundle
Production write without health gate passing
```

---

## TOKEN COMPRESSION

Full methodology + baseline measurements: `references/token-compression.md`.

```
1. Load references on-demand only — domain-gated, never all at once
2. Use apex_gh_file for single reads; avoid recursive apex_gh_dir
3. STEP 0 = one batched context block — do not repeat within the same task
4. Re-use cached platform-state in session; refresh only on health event
5. scripts/omniscan.py executes outside context window — zero token cost
```

---

## PLATFORM QUICK-REF

| Layer | Canonical Paths |
|-------|----------------|
| Frontend | src/components/ · src/pages/ · src/hooks/ |
| Edge Functions | supabase/functions/*/index.ts |
| CI/CD | .github/workflows/release.yml · ci.yml |
| Database | supabase/migrations/ + apex_db_schema tool |
| Cloudflare | workers/ · wrangler.toml |
| Tests | src/**/*.test.ts · e2e/*.spec.ts |
| Governance | governance/ci/scripts/apex_policy_check.py |
| Skills | .claude/skills/ · src/components/skills/SkillForgeWidget.tsx |

Active branch: `claude/gracious-mayer-0ba1m6` | Forge script: `.claude/skills/apex-skill-forge-v9-claude/scripts/forge.py`

---

## References

- `references/platform-map.md` — complete platform topology, all canonical paths, naming conventions
- `references/rsi-engine.md` — full repair protocol, escalation tree, contingency plans, postmortem templates
- `references/zero-trust.md` — complete security ruleset, RLS enforcement, credential audit, failsafes
- `references/token-compression.md` — compression methodology, baseline measurements, session patterns

---

**Version**: 1.0.0 | **Supersedes**: omnidev-apex v3.0.0
**License**: Proprietary — APEX Business Systems Ltd. Edmonton, AB, Canada
