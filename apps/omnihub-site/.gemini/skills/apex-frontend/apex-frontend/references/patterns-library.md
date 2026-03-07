# Patterns Library (UX + UI + Behavior)

Use this library to rapidly design robust, familiar-but-distinctive patterns.

## Pattern selection decision tree
- If user is **discovering** content → Search/Browse patterns
- If user is **choosing** one item → Compare/Select patterns
- If user is **creating** something → Wizard/Stepper patterns
- If user is **managing ongoing work** → Dashboard/Inbox patterns
- If user is **recovering** → Error/Empty/Undo patterns
- If user is **trust-sensitive** → Confirmation/Receipts/Explainers

---

## 1) Onboarding
### A) Progressive onboarding (recommended)
- Show value first, ask for permissions later when contextually needed.
- Keep first success < 60 seconds.
Deliverables:
- 3-screen max intro OR single screen with highlights
- “Skip” available
- First-run checklist (optional)

### B) Permission-gated onboarding (avoid unless necessary)
If must request permission early:
- Explain the benefit in plain language
- Offer “Not now”
- Provide path to enable later

---

## 2) Search
### A) Instant search with suggestions
- Empty query: show recent + trending + categories
- Query: suggestions + results
- No results: show spelling tips + broaden filters
Key details:
- Debounce input; show loading indicator; keep keyboard open.

### B) Faceted search
Use when items have multiple attributes.
- Default filters minimal
- Preserve filter state across sessions if helpful
- Provide “Clear all”

---

## 3) Lists
### A) Virtualized infinite lists
- Skeletons for initial load; inline spinner for pagination
- Retry on pagination failure
- Empty state with next actions
### B) Paginated lists
Use when total count matters or API supports cursor pagination.

---

## 4) Create / Edit flows
### A) Single-screen create
If < 5 inputs: one screen, primary CTA.
### B) Stepper/Wizard
If long: 3–7 steps; show progress; allow back without data loss.

---

## 5) Checkout / Payment / Commitments
Trust patterns:
- Clear summary before final commit
- Fees/taxes visible early
- Receipts/confirmation with next steps
- Save state across interruptions
Anti-patterns:
- Surprise totals at the end
- Hidden fees
- “Are you sure?” dialogs without explanation

---

## 6) Error recovery
### Inline errors (preferred)
- At point of failure
- Preserve user input
- Provide specific remediation
### Global errors
- Top banner for offline; non-blocking when possible

---

## 7) Empty states (must be actionable)
Types:
- First-time empty (“Nothing here yet”) → teach + CTA
- Cleared empty (“No results”) → refine + clear filters
- Permission empty → explain + settings link

---

## 8) Feedback + Undo
- Use snackbars/toasts for transient confirmation.
- Provide Undo for destructive actions when feasible.
- If irreversible, use explicit confirmation with consequence.

---

## 9) Settings
- Group by user mental model, not internal architecture.
- Put rarely used settings deeper; keep account/security visible.

---

## Pattern output template
When choosing a pattern, output:
- Why this pattern fits
- Key screens/components
- States + edge cases
- Acceptance criteria
