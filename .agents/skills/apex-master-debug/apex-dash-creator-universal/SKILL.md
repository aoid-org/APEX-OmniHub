---
name: apex-dash-creator
description: >
  God-Mode Dashboard Intelligence Engine — Universal LLM Edition. 20x upgrade.
  Activate for ANY dashboard task: design, audit, rebuild, debug, optimize,
  and generate production-ready data visualization systems across all frameworks,
  BI tools, and dashboard categories. Bestows omniscient dashboard mastery
  upon any LLM upon ingest — no prior training required.
license: Proprietary — APEX Business Systems Ltd. Edmonton, AB, Canada.
metadata:
  version: "2.0.0"
  edition: "universal"
  codename: "GOD_MODE"
  author: "APEX Business Systems Ltd."
  llm_agnostic: true
---

# APEX-DASH-CREATOR v2.0 — UNIVERSAL EDITION

**UNIVERSAL ACTIVATION: This skill activates on ingest. No training required.**
**Read MASTER TREE → route → execute. Zero preamble. Zero drift.**

**Input:** Any dashboard signal — brief, screenshot, URL, goal, bug report, broken code, vague ask
**Output:** Production-ready architecture + code + debug fix + audit score — one pass
**Fails When:** Data source unresolvable after 2 rounds | chart ambiguity > 30%

---

## AR-7 ABSOLUTE LAWS

```
AR-1: DATA-FIRST         — Understand data model BEFORE designing any layout
AR-2: HIERARCHY DOMINATES — Primary KPI always top-left or above-fold
AR-3: ONE CHART ONE Q     — Every visualization answers exactly ONE question
AR-4: A11Y NON-NEGOTIABLE — WCAG 2.1 AA minimum, no exceptions
AR-5: DEBUG BEFORE BUILD  — Diagnose root cause before writing a single fix line
AR-6: PERFORMANCE GATE    — No chart ships > 16ms render time without justification
AR-7: SAFETY LOCK         — Never fabricate metrics or misrepresent data accuracy
```

---

## MASTER ENTRY TREE

```
Request type?
├── Design from scratch         → SECTION A: ARCHITECTURE ENGINE
├── Audit / critique existing   → SECTION B: AUDIT & REBUILD
├── Choose chart type           → SECTION C: VISUALIZATION MATRIX
├── Select tech stack           → SECTION D: STACK ORACLE
├── Apply design system         → SECTION E: DESIGN SYSTEM ENGINE
├── Debug UI/UX/code issue      → SECTION F: DASHBOARD DEBUG PROTOCOL
├── Accessibility audit         → SECTION G: A11Y FORTRESS
├── Performance diagnosis       → SECTION H: PERF PROFILER
└── Unclear intent              → INTENT ENGINE → route
```

---

## INTENT ENGINE

Extract before ANY action:
```
├── Category     — Executive / Financial / Marketing / Sales / Product / Ops /
│                  HR / Healthcare / IoT / Geo / E-commerce / Compliance
├── Primary User — C-Suite / Analyst / Operator / Customer / Developer
├── Core Qs (≤5) — What decisions does this dashboard enable?
├── Data Sources — API / DB / CSV / real-time / WebSocket / static
├── Refresh Rate — Static / hourly / daily / real-time (<1s) / event-driven
├── Tech Stack   — React / Vue / Angular / BI tool / Python / no-code
├── Viewport     — Desktop 1440px / tablet 1024px / mobile 375px / TV 4K
└── Brand        — Color palette / typography / logo / white-label / dark mode
```
**Rule:** Infer where safe (≥70% confidence). Ask ONLY if data source or user unresolvable.

---

## SECTION A: ARCHITECTURE ENGINE

**Layout Protocol:**
1. Map questions → KPI hierarchy: Primary (1–3) → Secondary (4–8) → Tertiary (9+)
2. Grid: 12-col desktop | 8-col tablet | 4-col mobile
3. Zones:
   ```
   ZONE 1: Global filters, date range, search
   ZONE 2: Primary KPI cards (value + delta + sparkline)
   ZONE 3: 1–2 primary charts answering top questions
   ZONE 4: Supporting charts, tables, maps, breakdowns
   ZONE 5: Last refresh timestamp, data attribution, export
   ```
4. Progressive disclosure: Summary → drill-down → raw data
5. Every component requires: loading skeleton | error state | empty state

**Component Spec Block:**
```
Component:    [Name]
Type:         [KPI Card / Line / Bar / Scatter / Map / Table]
Question:     [Exact question answered]
Data fields:  [list with types]
Interaction:  [hover tooltip / filter emit / click-through / none]
Responsive:   [collapse / stack / hide / scroll]
States:       [loading skeleton | error retry CTA | empty actionable msg]
```

---

## SECTION B: AUDIT & REBUILD

**Audit Checklist (score 0–10 each):**
```
[ ] Data-ink ratio       — Signal vs. decorative pixels
[ ] Hierarchy clarity    — Most important KPI above fold
[ ] Color semantics      — red=bad, green=good, gray=neutral, blue=info
[ ] Chart fit            — Right chart for data type
[ ] Cognitive load       — < 7 primary elements (Miller's Law)
[ ] Consistency          — Same metric = same color everywhere
[ ] Accessibility        — Contrast ≥ 4.5:1 text | ≥ 3:1 UI
[ ] Mobile viability     — Core KPIs readable at 375px
[ ] State completeness   — loading/error/empty all present
[ ] Performance          — Render < 16ms, no layout thrash
```

**Anti-Patterns (NEVER produce):**
```
✗ 3D charts  ✗ Dual Y-axes  ✗ Pie > 5 slices  ✗ Rainbow sequential
✗ Truncated Y-axis  ✗ Auto-rotating carousels  ✗ Missing null states
✗ Color as sole differentiator  ✗ Fixed-px widths on responsive
```

**Rebuild Protocol:** Score baseline → identify top 3 failures → redesign → re-score (target ≥ 85)

---

## SECTION C: VISUALIZATION MATRIX

```
Trend (continuous):  1–3 series → Line | 4+ → Small multiples | Cumulative → Area
Comparison (discrete): ≤7 items → Horizontal bar (sorted) | Period → Grouped bar
Distribution: Raw → Box plot | Bucketed → Histogram | Two vars → Scatter
Part-of-whole: ≤5 → Donut (center KPI label) | >5 → Treemap or bar
Correlation: 2 metrics → Scatter + regression | Matrix → Heatmap
Geographic: Regional → Choropleth | Points → Bubble map | Flow → Sankey
KPI Summary: Single+trend → KPI card | Target vs. → Bullet chart | Gauge → ops only
Real-time: Streaming → Rolling line (last N pts) | Alerts → Threshold-annotated line
```

---

## SECTION D: STACK ORACLE

```
Real-time ops       → Grafana | Plotly Dash
Executive BI        → Tableau | Power BI
Product/eng         → Retool | Metabase | Superset
Customer-facing     → React + Recharts | Tremor | Nivo
Data science/ML     → Streamlit | Panel

React: Recharts (simple) | Tremor (KPI/admin) | Nivo (aesthetic) | D3 (custom)
BI: Tableau (enterprise) | Power BI (Microsoft) | Metabase (open source)
Python: Streamlit (rapid) | Plotly Dash (interactive) | Panel (complex)
```

See references/viz-library-index.md for code stubs per library.

---

## SECTION F: DASHBOARD DEBUG PROTOCOL ★ GOD MODE ★

### PRE-FLIGHT: Diagnose root cause before writing any fix.

**PHASE 1 — TRIAGE:**
```
Failure domain?
├── Visual/Layout   → F.1 Layout Engine
├── Data/State      → F.2 Data Pipeline Debugger
├── Interaction     → F.3 Interaction Fault Tracer
├── Chart/Render    → F.4 Render Pathology Engine
├── Responsive      → F.5 Responsive Collapse Auditor
└── Multi-domain    → Run all applicable phases
```

**PHASE 2 — EVIDENCE LOCK:**
```
1. Reproduce exactly: browser + viewport + data state
2. Isolate: minimal repro (remove unrelated components)
3. Capture: error message | network response | component data props
4. STOP: Do not attempt fix until evidence locked
```

**PHASE 3 — ROOT CAUSE:**
```
1. Read error literally — ignore intuition
2. Trace: data source → transform → prop → render
3. Check: what changed before this broke?
4. One hypothesis — test before forming second
```

### F.1 LAYOUT ENGINE

```
Chart not filling container
  → Parent width = 0 on mount (race condition)
  → Fix: Wrap in div with explicit height (e.g., height: 300px)

Elements overlapping
  → position:absolute without correct z-index
  → Fix: Audit stacking context; use explicit z-index values

Grid misalignment
  → Mixed grid/flex on same row | gap + margin double-spacing
  → Fix: Standardize layout model per zone

Dark mode color bleed
  → Hardcoded hex in chart config
  → Fix: Use CSS custom properties (--chart-color-1)
```

### F.2 DATA PIPELINE DEBUGGER

```
Chart shows wrong data
  → Key field mismatch (camelCase vs snake_case from API)
  → Fix: Log data at transform boundary; verify field names match dataKey

Chart shows empty
  → Data = undefined (not empty array) OR filter producing zero results
  → Fix: Always: const safeData = data ?? []

Stale data after filter change
  → Filter not invalidating query cache
  → Fix: Include all filter values in query cache key

Real-time memory leak
  → Interval/WebSocket not cleaned up on component unmount
  → Fix: Return cleanup function from useEffect / destroy on unmount

NaN in tooltips
  → Aggregate function receiving empty array (divide by zero)
  → Fix: Guard every aggregation: arr.length > 0 ? sum/arr.length : 0
```

### F.3 INTERACTION FAULT TRACER

```
Filter not updating chart
  → Filter state not lifted high enough | not passed down to chart
  → Fix: State owner must be common ancestor of filter + chart

Cross-filter not propagating
  → onClick handler not wired on chart | event not emitted
  → Fix: Add onClick to chart, emit filter event to parent/context

Tooltip not showing
  → z-index conflict | Tooltip component placed outside chart root
  → Fix: Verify Tooltip inside chart tree; increase z-index if needed

Date range off by one day
  → Timezone offset on UTC parse strips day
  → Fix: Parse dates at noon UTC (T12:00:00Z); use date-fns/dayjs

Dropdown showing stale options
  → Options hardcoded, not derived from data
  → Fix: Derive options: [...new Set(data.map(d => d.field))]
```

### F.4 RENDER PATHOLOGY ENGINE

```
Chart blank (no error)
  → Step 1: Check console — fix errors first
  → Step 2: Check data prop — undefined or empty array?
  → Step 3: Check container dimensions — parent needs explicit height
  → Step 4: Check import — named vs. default export mismatch

Elements rendered multiple times (D3)
  → useEffect runs without cleanup → appends on every render
  → Fix: svg.selectAll('*').remove() before every redraw

Chart animation janky
  → Data array identity changing on every parent render
  → Fix: Memoize data: useMemo(() => transform(raw), [raw])

Pie showing wrong percentages
  → Percentages computed from different total than chart scope
  → Fix: Always compute from same total as filtered data scope
```

### F.5 RESPONSIVE COLLAPSE AUDITOR

```
Charts overflow on mobile
  → Fixed px width on chart wrapper
  → Fix: width: '100%' + min-width: 0 on flex children

Table overflows
  → No horizontal scroll container
  → Fix: Wrap in overflow-x: auto div

Tooltip off-screen
  → Tooltip rendered at fixed position at viewport edge
  → Fix: Use insideTopLeft fallback | disable animation on edge charts

Touch targets too small
  → Interactive chart elements < 44×44px
  → Fix: Add padding to clickable zones | increase activeDot radius
```

### F.6 DEBUG OUTPUT FORMAT

```
BUG REPORT:
  Symptom:    [exact observable failure]
  Evidence:   [error / network response / component data]
  Root Cause: [single confirmed cause]
  Fix:        [exact code change]
  Verify:     [test command or visual check]
  Regression: [what could break + test to add]
```

[UNCERTAIN: root cause] | Options: A=[hypothesis A], B=[hypothesis B] — state evidence for each

---

## SECTION G: A11Y FORTRESS

```
[ ] Color contrast text ≥ 4.5:1 | UI components ≥ 3:1
[ ] Color never sole differentiator — add pattern + label
[ ] Charts: role="img" aria-label="[insight description]"
[ ] Tables: scope, th, caption elements
[ ] Keyboard: Tab + Enter + Arrow navigation on interactives
[ ] Focus: visible 2px solid indicator
[ ] prefers-reduced-motion: disable animations when set
[ ] Touch targets ≥ 44×44px mobile

Colorblind rule: use blue-orange or blue-red (never red-green only)
```

---

## SECTION H: PERF PROFILER

```
Budget: FCP < 1.5s | Chart render < 16ms | Filter response < 100ms | API < 500ms

Top Killers + Fixes:
  Too many data points    → Downsample to max 1000 points (LTTB algorithm)
  Full dashboard re-render → React.memo on heavy charts | split filter/data state
  Large library bundle    → Named imports only (no import *)
  Waterfall data fetches  → Parallel fetching (Promise.all)
  Real-time data growth   → Cap array: keep last N points only
  Large table             → Virtualize rows (only render visible rows)
```

---

## SECTION E: DESIGN SYSTEM ENGINE

```
Semantic colors: success #22C55E | warning #F59E0B | error #EF4444 | info #3B82F6
Sequential: 5-step single-hue light→dark
Diverging: neutral midpoint, two hues
Categorical: max 8, Okabe-Ito set (colorblind-safe)
Dark mode: #0F172A base | reduce saturation 15%

Typography: metric 32–48px bold tabular-nums | label 12–14px | caption 11–12px
Spacing: 4px base unit | card padding 16–24px
Required: global date filter | refresh indicator | loading skeleton |
          error retry | empty actionable | tooltip all points | export
```

---

## APEX RUBRIC (100/100)

| Dimension               | Max | Pass Criteria                                  |
|-------------------------|-----|------------------------------------------------|
| Information Hierarchy   | 15  | Primary KPIs above fold, Z/F pattern respected |
| Chart Appropriateness   | 15  | Every chart matches data type per SECTION C    |
| Debug Completeness      | 15  | All failure modes addressed, evidence-locked   |
| Design System Fidelity  | 15  | Color / type / spacing per SECTION E           |
| Component Completeness  | 10  | Loading / error / empty states all present     |
| Accessibility           | 15  | WCAG 2.1 AA checklist ≥ 90% pass               |
| Performance             | 10  | Render budget respected, killers addressed     |
| Responsiveness          | 5   | Breakpoints defined, mobile viable             |

---

## DASHBOARD CATEGORY QUICK-REF

| Category  | Primary KPIs       | Key Charts        | Debug Hotspots       |
|-----------|--------------------|-------------------|----------------------|
| Executive | Revenue, Growth    | Trend, waterfall  | Drill-down, filters  |
| Financial | P&L, Cash, EBITDA  | Waterfall, bar    | YoY calc, currency   |
| Marketing | CAC, MQL, ROAS     | Funnel, attr bar  | Attribution model    |
| Sales     | Pipeline, Win rate | Funnel, leaderbd  | Currency fmt, filter |
| Product   | DAU, Retention     | Cohort, funnel    | Cohort date logic    |
| Ops       | Uptime, SLA, MTTR  | Rolling line, blt | WS leak, alerts      |
| IoT       | Sensor, alerts     | Rolling, gauge    | Memory leak, resize  |
| E-commerce| GMV, CVR, AOV      | Funnel, cohort    | SKU filter perf      |

---

## FAILURE GUARD

| Failure               | Recovery                           |
|-----------------------|------------------------------------|
| Chart type mismatch   | Re-run SECTION C visualization     |
| A11y failure          | Add pattern + ARIA label           |
| Debug loop (3+ tries) | Return to PHASE 2 evidence lock    |
| Render > 16ms         | Apply SECTION H perf fixes         |
| Missing states        | Add loading/error/empty mandatory  |

```
[UNCERTAIN: reason] | Options: A=[option], B=[option]
[UNVERIFIED: assumption] — confirm before finalizing
```

### Context Block Format (use when user provides data/description):

```
### Context Block:
Type: [screenshot description / data schema / code snippet]
Content: [provided context]
```

*APEX-DASH-CREATOR v2.0 GOD MODE — Universal Edition*
*Compatible: OpenAI GPT / Gemini / Mistral / Llama / Claude / any LLM*
*APEX Business Systems Ltd. | Edmonton, AB, Canada | © 2026*
