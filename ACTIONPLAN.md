APEX Business Systems — Lazy-CEO Action Plan 2026This is a complete execution playbook for APEX Business Systems Ltd., structured as 7 Missions across two tracks: the OmniHub Product Track and the Revenue Engine Track. Each mission has a designated AI agent, a copy-paste prompt, time estimate, and success criteria.

Mission 0 — Agent Selection GuideBefore doing anything, pick the right AI coding agent for the task. The wrong agent produces the wrong output.

Agent	Best For	Strength	Avoid WhenCodex (blue)	Large autonomous codebase tasks, full-repo audits, multi-file feature builds	Runs full repo context; writes, edits, and tests across dozens of files in one pass	Quick 1-file fixes (overshoot risk)Jules (green)	GitHub PR-based tasks, small targeted changes, CI/CD fixes	Opens PRs directly; GitHub-native; great for isolated features	Complex multi-file refactorsClaude Code (purple)	Architecture decisions, debugging, TypeScript precision, interactive problem-solving	Best reasoning; explains decisions; handles ambiguity gracefully	Large batch autonomous executionAntigravity (amber)	New app prototyping, exploratory builds, standalone tools	Fast iteration on greenfield; good UI/UX instincts	Production codebase changes requiring existing contextLazy-CEO Rule: Never debug an agent's output yourself. If it fails, paste the error back with "Fix this. Do not change anything else." One retry max — if it fails twice, switch agents.

OmniHub TrackRun these in order. The audit must complete before the marketing site launches.

M-01 — Full Production AuditAgent: Codex | Time: 30–45 min | Priority: 🔴 Do First

A 19-point security, performance, CI/CD, and architecture audit of the APEX OmniHub repo. Outputs a prioritized gap report with file paths and line numbers. No code changes — audit only.

The 19 checks cover four layers:

Security (7 checks): Security headers, Supabase RLS policies, environment variable leaks, CORS config, prompt injection protection, rate limiting, npm audit for critical vulnerabilities.

Performance (4 checks): Bundle chunk sizes (flag >500KB), N+1 query patterns, unoptimized images (flag >100KB), React.lazy() code splitting.

CI/CD (4 checks): GitHub Actions gate status, pending Supabase migrations, TypeScript strict mode, test coverage (flag files below 80%).

Architecture (4 checks): Guardian threshold config, Temporal workflow timeouts and retry policies, OmniRoute registration, OmniPort HMAC-SHA256 signing.

The output report is structured as a table with Critical 🔴 / High 🟡 / Medium 🟠 / Pass ✅ levels, each gap including exact file + line reference and estimated fix time.

M-02 — Marketing WebsiteAgent: Claude Code | Time: 3–4 hrs | Priority: 🔴 Revenue Blocker

Build the complete APEX OmniHub marketing site from scratch — a 9-section production site in React 18 + TypeScript + Tailwind, deployed to Cloudflare Workers at apexomnihub.icu.

The 9 sections and their exact copy are:

Nav — Sticky with blur on scroll, gold wordmark, center links, "Book a Demo" CTA.

Hero — Headline: "Enterprise AI that actually runs in production." 4-stat bar: 79% AI Agents Adopted | 11% Running in Production | 40% Projects Cancelled by 2027 | 0% Escape Rate (MAN Mode). Two CTAs: Book Demo + 4-min Loom video modal.

Social Proof Bar — "Backed by Alberta Innovates TDA" | "Audited Value: $12M–$60M USD" | "3,120 Passing Tests · SonarQube A-Grade · 93K LOC".

Problem — Three problem cards: No Governance, No Rollback, No Accountability.

Features — Six cards: 🔐 MAN Mode, 🛡 Guardian, 🔀 OmniRoute, 📋 Full Audit Trail, ↩ Rollback Engine, ⚡ OmniPort.

How It Works — Three steps: Connect Agents → Guardian Monitors → MAN Mode Protects.

Pricing — Three tiers: Starter ($299/mo), Pro ($999/mo — Featured), Enterprise (Custom).

Book Demo — Form: Name, Work Email, Company, Team Size. Posts to /api/demo-request.

Footer — APEX branding + Privacy, Terms, GitHub, LinkedIn links.

Design rules: background #080808, accent gold #C9A84C, Syne display font + Inter body, zero external images, CSS transitions only, mobile-first at 375px.

M-03 — OmniDash Real-Time Observability UpgradeAgent: Codex | Time: 4–6 hrs | Priority: 🟡 High

Audit existing OmniDash panels, replace all mock data with Supabase Realtime subscriptions, and add 7 production-grade monitoring panels.

The 7 panels:

Panel	Type	Data SourceSystem Health Overview	4 metric cards (Agents, Workflows, Guardian Alerts 24h, MAN Mode Pending)	Supabase RealtimeAgent Activity Timeline	Recharts LineChart — calls per minute, last 60 min	Supabase RealtimeGuardian Alert Feed	Scrolling list, newest first, severity badges	Supabase RealtimeMAN Mode Review Queue	Table with Approve/Reject RPCs, inline rejection reason input	Supabase RealtimeOmniRoute Traffic	Horizontal bar chart — requests per route, last 1h	React Query, 60s refreshWorkflow Status Board	4-column kanban (Pending/Running/Completed/Failed) with detail dialog	React QuerySystem Sparklines	6 mini AreaCharts (latency, DB connections, edge latency, auth RPS, sessions, cache hit rate)	React Query, 30s refreshDashboard layout uses CSS Grid across 5 rows. All Supabase Realtime subscriptions must clean up on unmount. Zero mock data in production.

Revenue Engine TrackRun M-04 and M-07 in parallel. M-05 and M-06 are independent and can run in any order.

M-04 — TradeLine 24/7 Cost Structure SurgeryAgent: Claude Code | Time: 2–3 hrs | Priority: 🔴 Do First — bleeding money

TradeLine burns more than it earns at 1 client. This mission implements 4 cost reduction systems targeting a 70% AI inference cost reduction.

System 1 — Model Tiering: Routes simple requests (hours, address, pricing, booking) to claude-haiku (~10x cheaper) and complex requests to claude-sonnet. A classifyComplexity() function auto-routes based on keywords and prompt length. Clients can override their tier stored in the database.

System 2 — KV Response Caching: Caches eligible responses (hours, address, service descriptions) in Cloudflare KV with 24h TTL for static info and 1h for semi-dynamic. Never caches PII, payment data, or personal account information. Cache hits are logged non-blocking to Supabase.

System 3 — Per-User Rate Limiting: Enforces daily call limits by tier: Free (10 calls/day), Starter (100 calls/day), Pro (500 calls/day), Unlimited. Returns a graceful human-readable message — never an HTTP 429 error to end users.

System 4 — Usage Tracking Migration: SQL migration creates a usage_tracking table with an atomic increment_usage() RPC function that records calls, tokens consumed, cache hits, and estimated cost per call per day.

M-05 — TradeLine HVAC Alberta Landing PageAgent: Antigravity | Time: 45 min | Priority: 🟡 High — outreach enabler

A single-file index.html conversion landing page targeting HVAC contractors in Alberta. Zero external dependencies. Dark/gold design. CTA above fold on all devices. Deploys to Cloudflare Workers with wrangler.json.

Page structure: sticky Nav → Hero (H1: "Your HVAC Company Answers Every Call. Even at 11pm.") → 3 Pain Point cards (missed calls, lost revenue, techs on job) → How It Works (3 steps) → Testimonial → Pricing card ($297 CAD/month + $497 one-time setup, 30-day guarantee) → Booking Form → Footer. Form shows inline thank-you message on submit without page reload.

M-06 — SBBL HQ League 2 Activation + PPV at $9.99 CADAgent: Codex | Time: 3–5 hrs | Priority: 🔴 Revenue Event This Week

Activate the TGIF League configuration, enable the PPV paywall at $9.99 CAD, and verify the full end-to-end payment flow. Context: April 2 launch generated $1,000+ before an injury pause; all payments were refunded. Now relaunching.

The 6 steps:

Database configuration — Insert TGIF League record into leagues table (or create table + migration if it doesn't exist).

PPV price configuration — Update all hardcoded prices to $9.99 CAD, update .env.example.

PPV paywall gate activation — Verify the gate logic: purchasers see video, non-purchasers see the $9.99 CAD upgrade modal. Stripe Checkout session must use currency: 'cad' and unit_amount: 999.

Access control + replay window — After successful Stripe payment, create a ppv_purchases row with expires_at = now + 72 hours. Stripe webhook verifies signature, extracts metadata, inserts row.

Twitch embed autoplay fix — Initialize every Twitch embed with { muted: true, playsinline: true, autoplay: true }. Ensure CSP headers permit Twitch + Facebook Live frame-src.

Refund safety verification — Confirm one-click admin refund flow still works, revokes access on refund, updates ppv_purchases.status to 'refunded'. Non-negotiable — learned from April 2.

M-07 — aSpiral Stripe Paywall LaunchAgent: Jules | Time: 1–2 hrs | Priority: 🟡 Ship day App Store approves

Add a premium tier paywall to the aSpiral app via a GitHub Pull Request. $7/month or $49 lifetime. Free tier gates at 3 daily uses. Jules opens the PR directly — you review and merge on App Store approval day.

The 8 new files Jules creates:

src/lib/stripe.ts — Stripe initialization, createCheckoutSession(), createPortalSession()

supabase/migrations/[timestamp]_subscriptions.sql — subscriptions table with RLS policies

src/hooks/useSubscription.ts — Returns { isPremium, isLoading, subscription }

src/hooks/useDailyUsage.ts — localStorage usage counter, resets at midnight, free limit from env var

src/components/PaywallGate.tsx — Wrapper that shows blur overlay after 3 free daily uses, with $7/mo and $49 lifetime upgrade buttons

supabase/functions/stripe-webhook/index.ts — Handles checkout.session.completed, subscription.updated, subscription.deleted

src/pages/Upgrade.tsx — Upgrade page with success state handling

src/components/PricingSection.tsx — Free vs Premium pricing cards with billing toggle

Target: 40 conversions = $280–$1,960 MRR on launch day.

Bonus — B-01: The Loom Video Script (Record This Yourself)No agent can do this. 2 hours. Zero dollars. The document describes it as "the highest-leverage action in the plan."

The 4-minute script structure:

0:00–0:20 Hook: "79% of enterprises say they've adopted AI agents. Only 11% have them running in production. I'm going to show you exactly why — and what we built to fix it."

0:20–1:00 Problem: Show a competitor agent failing silently. No audit trail. No recovery.

1:00–2:30 Guardian in action: Trigger a policy violation in demo mode. Show Guardian catch it. Show MAN Mode escalation in OmniDash.

2:30–3:30 Audit trail: Show the full immutable log. "Compliance teams can sign off on this."

3:30–4:00 CTA: "Book 15 minutes — I'll show you this live on your use case."

LinkedIn caption: "79% of enterprises have adopted AI agents. Only 11% run them in production. We built the platform that closes that gap. [Loom link] — 4 minutes. No pitch. Just the product."