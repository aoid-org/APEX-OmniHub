## Contents

1. Signal Detection Patterns
2. Priority Classification System
3. Repair Loop Protocol
4. Root-Cause Investigation Method
5. Escalation Tree
6. Self-Orchestration Rules
7. Postmortem Templates
8. Contingency Plans

---

## 1. Signal Detection Patterns

The RSI engine monitors for these categories of anomaly. Each maps to a priority level:

| Signal Type | Detection Method | Priority |
|-------------|-----------------|----------|
| Platform health degradation | apex_platform_health non-healthy | P0 or P1 |
| Error log spike (>5 new errors/min) | apex_error_log rate | P0 |
| CI pipeline failure | apex_gh_workflows fails > 0 | P1 |
| Module state offline | apex_module_states shows OFFLINE | P0 or P1 |
| RLS gap detected | apex_db_rls_check returns disabled | P0 |
| Test regression introduced | Vitest count drops below 2,480 | P1 |
| ESLint warnings introduced | --max-warnings 0 violated | P2 |
| Missing data-testid attribute | E2E smoke test fails | P2 |
| Performance degradation | apex_dashboard_kpis below baseline | P2 |
| Documentation drift | Docs out of sync with code | P3 |

---

## 2. Priority Classification System

```
P0 — CRITICAL (production down or data loss occurring)
├─ Response: CRIT-MODE — immediate action, no planning phase
├─ Timeline: fix within 15 minutes or escalate
├─ Blast radius: accept wider fix if needed to restore service
└─ Examples: platform_health=CRITICAL, RLS disabled, service key exposed

P1 — HIGH (data loss risk or major functionality broken)
├─ Response: SURGICAL — isolate, fix, verify before anything else
├─ Timeline: fix within 1 hour
├─ Blast radius: 1 file / 1 function strictly
└─ Examples: handleModuleState() stubbed, live-data wiring gap, CI gate broken

P2 — MEDIUM (degraded but not down)
├─ Response: ROOT-CAUSE cycle — full investigation before fix
├─ Timeline: fix within current session
├─ Blast radius: 1–3 files
└─ Examples: ESLint warning, E2E test gap, missing testid, slow KPI

P3 — LOW (warning or drift)
├─ Response: QUEUE — document, schedule, do not interrupt current work
├─ Timeline: next available session
├─ Blast radius: planned, reviewed
└─ Examples: doc drift, deprecated syntax, cosmetic UI inconsistency
```

---

## 3. Repair Loop Protocol

Every repair, regardless of priority, follows this loop:

```
STEP 1 — ISOLATE
├─ Identify the single failing unit (function, component, edge fn, migration)
├─ Read source with apex_gh_file [exact path]
├─ Do NOT read adjacent files unless isolation fails

STEP 2 — EVIDENCE
├─ apex_error_log [severity:error, limit:20] → capture stack trace
├─ apex_audit_log [since: fix window] → capture recent changes
└─ Never propose a fix before seeing the evidence

STEP 3 — HYPOTHESIZE
├─ State ONE root cause in one sentence
├─ If multiple candidates: pick the one with the highest explanatory power
└─ Do NOT test multiple hypotheses simultaneously

STEP 4 — FIX
├─ Minimal change — no refactoring while fixing a bug
├─ Blast radius = 1 file / 1 function (P1/P2); 1 module max (P0)
└─ Annotate every changed line with intent

STEP 5 — VERIFY
├─ apex_platform_health → must return healthy
├─ apex_module_states   → all Tri-Force modules active
├─ apex_error_log       → zero new P0/P1 entries since fix timestamp
└─ Run relevant test: apex_edge_invoke [fn] or check apex_gh_workflows

STEP 6 — POSTMORTEM
└─ Write 3 lines to apex_audit_log: what happened · root cause · prevention
```

If STEP 5 fails: do NOT loop back to STEP 4 immediately.
Return to STEP 1 with fresh evidence — the hypothesis was wrong.

---

## 4. Root-Cause Investigation Method

When the root cause is not immediately obvious, use this method:

```
DECONSTRUCT → TRACE → DIFF → CONFIRM

1. DECONSTRUCT: List all components involved in the failure path
2. TRACE: Follow data flow from input to failure point
   - Use apex_gh_file to read each component in the path
   - Use apex_db_schema to verify data shape at each boundary
3. DIFF: Compare against last known-good state
   - apex_gh_commits [branch, limit:5] → find last passing commit
   - apex_gh_file [path, ref: last-good-commit] → diff mentally
4. CONFIRM: Verify hypothesis with apex_error_log or apex_edge_invoke
```

Three failed hypotheses → question the architecture, not the implementation.
Load `references/platform-map.md` §Module Connections to re-examine the data flow at a higher level.

---

## 5. Escalation Tree

```
Attempt 1 fails → Attempt 2 (different approach, same root cause)
Attempt 2 fails → STOP — do not attempt a third fix
                 → Read references/platform-map.md §Module Connections
                 → Re-diagnose from platform topology, not component level
                 → State: UNCERTAIN: [specific gap blocking resolution]
                 → Document unresolved state in apex_audit_log
                 → Request human review with full evidence chain

Platform-wide failure (all modules down):
→ apex_error_log [severity:critical, limit:50] first
→ apex_cf_deployment → check Cloudflare status
→ apex_gh_workflows [limit:3] → check last deploy
→ apex_db_read [module_states, limit:5] → check state history
→ If no root cause in 10 min: rollback the last deploy

Data loss confirmed:
→ HARD STOP on all write operations
→ apex_db_rls_check → verify all table policies immediately
→ Document incident scope in apex_audit_log
→ Do not resume writes until RLS confirmed on all affected tables
```

---

## 6. Self-Orchestration Rules

The RSI engine self-orchestrates under these standing rules:

```
RULE 1 — Context before action
  Never write code before reading the source. Always apex_gh_file first.

RULE 2 — One hypothesis, one fix
  Parallel fixes introduce uncertainty about which one worked.

RULE 3 — Health gate is the oracle
  apex_platform_health returning healthy is the authoritative pass signal.
  Test suites and log counts are supporting evidence, not the primary signal.

RULE 4 — Blast radius discipline
  P0 accepts module scope. P1/P2 accept 1 file. P3 accepts planned scope.
  Wider fixes require explicit approval — never implicit.

RULE 5 — Never rationalize a HARD STOP
  RLS disabled, credential exposed, service-role key in bundle:
  these are stops, not warnings. No exception, no "just this once."

RULE 6 — Postmortem always
  Every fix writes 3 lines. The platform learns from every event.
```

---

## 7. Postmortem Templates

Write to apex_audit_log after every fix:

**Standard fix:**
```
What:  [Component X] was [failing behavior] because [root cause].
Cause: [Root cause in one sentence — data flow, config, code defect].
Fix:   [What changed] · [File path] · [Regression prevented by: test/gate].
```

**P0 incident:**
```
Incident:  [Start time] → [End time] · Duration: [X min]
Impact:    [Modules affected] · [Users affected estimate]
Root:      [Root cause chain — from signal to source]
Fix:       [What was changed and why it resolved the signal]
Prevention: [What gate/test/check now prevents recurrence]
```

---

## 8. Contingency Plans

| Scenario | Contingency |
|----------|-------------|
| apex-omnihub-connector MCP unreachable | Use apex_gh_file to read source locally; note all writes blocked |
| Supabase connection failure | Check APEX_SUPABASE_URL env; verify Cloudflare tunnel; apex_cf_deployment |
| GitHub API rate limit | Wait and batch; use apex_gh_file with specific refs not search |
| Temporal.io worker down | Check workflow_runs table via apex_db_query; restart via apex_edge_invoke |
| All CI gates failing post-deploy | Rollback: apex_gh_commits → identify last green → apex_gh_pr_status [rollback PR] |
| Production data anomaly | Freeze writes → apex_db_rls_check all tables → apex_audit_log audit trail |
