---
version: 1.0.0
last_audited: 2026-07-05
status: verified
---

# RFC: OmniDash Surface and Links Remediation

Status: Approved
Owner: Antigravity Co-Founder
Date: 2026-07-05
Related Tickets: APEX-2026-07
Affected Domains: OmniDash, Links, Automations, Workflows

---

## 1. Problem

Staging mock/demo/local behaviors in OmniDash modules lacked durable offline persistence, active integration, or was blocked unnecessarily. Specifically:
- Staged links were memory-only during offline mode and did not persist across page reloads.
- Handoff of link context to OmniSlate was unconnected.
- Automation run logs did not fetch from the live audit_logs database.
- Execution of demo workflows/automations was hard-blocked, preventing testing/simulating of workflow layouts.

## 2. Exact User

APEX Business Systems dashboard operators and QA automated test runners.

## 3. Workflow

- Operator logs into OmniDash and views system KPIs.
- Operator stages links/URLs for context during active sessions.
- Operator executes workflow/automation scenarios for validation.

## 4. Current Pain

- Refreshing the browser deletes staged links context.
- Selected links cannot be transferred to the OmniSlate prompt pane.
- Executing standard demo items errors out on UUID validation.

## 5. Current Workaround

None. Operations were blocked or flagged in the release matrix.

## 6. Proposed Change

- Implement localStorage backing for staged links context in offline mode (`apex.staged.links`).
- Connect `send-to-omnislate` action in `LinksModule.tsx` to `useOmniSlateStore` to append context items.
- Wire `view-logs` action in `AutomationsModule.tsx` to fetch the 10 most recent rows from the Supabase `audit_logs` table.
- Allow executing demo workflow and automation rows by performing an honest simulated local run instead of hard-blocking with UUID checks.

## 7. Business Capability

- Analytics
- Admin Operations
- Notifications

## 8. Ownership Boundary

Owned by OmniDash layout components and respective module modals.

## 9. Data Flow

1. Links: Local input -> localStorage persistence -> Zustand context store.
2. Automations: User click -> Supabase client `select` -> formatted log text returned to UI.

## 10. Contracts

Reuses existing `audit_logs` table schema and Zustand store `useOmniSlateStore`.

## 11. Failure Modes

If localStorage is blocked by browser policy, the application degrades gracefully to memory-only staging.

## 12. Observability

Logs trace actions via normal console error logs and audit trail entries.

## 13. Rollback Strategy

Revert files to original state. No database migrations were added, keeping data schemas intact.

## 14. Security Impact

RLS is fully enforced on the `audit_logs` table (only select own logs).

## 15. Scalability Impact

Negligible. Storage is limited to 12 items in localStorage, and queries are capped at `limit(10)`.

## 16. AI Impact

Yes, links handoff updates the context items consumed by the AI Agent prompt system.

## 17. IN SCOPE

- Staged links persistence
- Handoff context to OmniSlate
- Audit logs fetching for Automations
- Simulation of demo runs

## 18. OUT OF SCOPE

- Full production OAuth mock testing.

## 19. Success Metrics

All 23 Playwright E2E tests pass, including layout verification and alignment gates.

## 20. Architecture Review Checklist

- [x] No god object introduced
- [x] Domain boundary preserved
- [x] Cross-domain database writes avoided
- [x] Contracts documented
- [x] Rollback path defined
- [x] Observability defined
- [x] Failure modes defined
- [x] Security impact reviewed
- [x] Performance impact reviewed
- [x] Scope boundaries explicit
- [x] User workflow improvement clear

## 21. Approval

Product Owner: APEX Business Systems / 2026-07-05
Architecture Reviewer: Antigravity Co-Founder / 2026-07-05
