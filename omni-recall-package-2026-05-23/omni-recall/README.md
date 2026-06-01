# Omni-Recall Memory Framework
**Version:** 1.7.1 | **Date:** 2026-06-01 | **Author:** Lead AI Co-Founder | **Status:** Audited & Active

Welcome to **Omni-Recall**, the persistent GPT-operated continuity system for knowledge, preferences, project memory, and architectural corrections inside this memory workspace (`omni-recall-package-2026-05-23/omni-recall/`).

---

## 1. Directory Structure

```text
omni-recall-package-2026-05-23/omni-recall/
  ├── CLAUDE.md                    #short-form governing rules and guidelines
  ├── default-use-rule.md           #Inbound operating rules and triggers
  ├── do-not-do.md                  #System constraints and never rules
  ├── ingestion-rules.md            #Metadata guidelines for new sources
  ├── omni-recall-master-blueprint  #The master runtime architecture blueprint
  ├── quality-bar.md                #Pre-submit validation rules
  ├── start-here.md                 #Durable memory entry point
  ├── user-operating-model.md       #Inferred user tendencies and output styles
  │
  ├── raw/                          #Immutable source materials & exports (Phase 2)
  │
  ├── wiki/                         #AI-maintained canonical workspace knowledge
  │   ├── _core_directives/         #Core directives and linking files
  │   ├── audit/                    #Security & compliance audits
  │   ├── corrections/              #Seeded and active correction logs
  │   ├── runbooks/                 #High-fidelity step-by-step manuals
  │   ├── user_patterns/            #Observed style rules and seed log templates
  │   └── source_indexes/           #Source tracking and references indexes
  │
  ├── state/                        #Runtime status check documents
  │   └── checkpoints/
  │       └── current-status.md     #Staging and deployment statuses
```

---

## 2. Ingested Operations & Milestones (2026-05-26)

We successfully audited all files in the package and integrated the memory for **PhysiOmni (Phase 1 Sense Layer)**:
- **PhysiOmni white-label cockpit `/physiomni-pilot`** successfully developed and routed in `App.tsx`.
- **Deno Edge Ingress function `physiomni-ingress`** successfully compiled and deployed via CLI to project `rtopreovkywofgwgmozi`.
- **Secure Redaction:** Purged raw token secrets from git commit history via git amending to pass remote Push Protection gates.
- **Linter Remediations:** Relocated additive SQL linter allowlist comments to preceding lines to resolve CI linter failures.
- **RFC Markers:** Aligned Pull Request body parameters with architecture review rules to clear GitHub CI governance checks.

We successfully executed the **Marketing & UI/UX Stabilization Pass (2026-06-01)**:
- **Auth Misconfiguration Separation:** Prevented infrastructure auth errors (missing Supabase keys) from confusing users by separating them from standard invalid credentials (now returning a clean "Invalid email or password" layout).
- **Video & Audio Media Optimization:** Transcoded `apex-demo-video.mp4` to H.264 / AAC and removed visual mjpegs from `brand-anthem.mp3`. Wired captions at `/captions/demo.vtt` with exact headers on Cloudflare Pages.
- **SPA Routing Restoration:** Cleaned up Vercel-legacy static `.html` rewrites to fully route all clean subpages within React Router, preventing asset drift.
- **Unified Design Shell:** Standardized visual indicators on feature subpages (Grid layout, orbit circles, floating orb containers) matching White Fortress UI guidelines.
- **Rigorous Verification Gate:** Deployed QA verification script, checking 31 structural validation rules, fully integrated with Playwright.

---

## 3. Important Runbooks & Audits

- For step-by-step testing, local CLI emulation, and telemetry troubleshooting, see the [PhysiOmni Operator Runbook](file:///C:/Users/sinyo/OMNILINK-APEX%20HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub/omni-recall-package-2026-05-23/omni-recall/wiki/runbooks/physiomni-operator-runbook.md).
- For strict static analysis checks, database RLS rules, and git push compliance, see the [Security and Compliance Audit](file:///C:/Users/sinyo/OMNILINK-APEX%20HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub/omni-recall-package-2026-05-23/omni-recall/wiki/audit/security-and-compliance-audit.md).
- To view historical correction patterns, see the [Preceding-Line Migration Correction](file:///C:/Users/sinyo/OMNILINK-APEX%20HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub/omni-recall-package-2026-05-23/omni-recall/wiki/corrections/001-migration-linter-preceding-line.md).

---

## 4. Continuity Promise

Omni-Recall is designed to stay **quiet by default** ("wind, not dashboard") while permanently retaining decisions, preferences, and lessons. Future AI co-founders should consume this framework at start-up to establish rapid alignment.
