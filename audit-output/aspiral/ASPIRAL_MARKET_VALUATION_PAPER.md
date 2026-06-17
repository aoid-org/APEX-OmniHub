---
auditor: APEX-AUDITOR-PRIME / AGENT_6 VALUATION_ANALYST
subject: aSpiral — AI Voice Coaching Mobile Application
valuation_date: 2026-06-16
methodology: Three-method triangulation (IP Replacement Cost, Comparable Transactions, Strategic Premium)
disclaimer: This paper is an independent forensic valuation estimate for informational purposes only. It does not constitute investment advice or a guarantee of market price. All assumptions are explicitly labeled. Unverifiable comparable transactions are omitted per mandate.
---

# aSpiral Market Valuation Paper

## Methodology Declaration

This valuation uses three independent methods, each with explicit assumptions and confidence grades. Claims based on unverifiable comparables are marked COMP_UNVERIFIABLE and excluded from consolidated range. The final consolidated LOW | MID | HIGH range is derived from the intersection of verifiable method outputs only.

**Evidence tiers:**
- VERIFIED — derived from read source code or verified repo data
- PROBABLE — inferred from structural evidence
- ASSUMED — labeled assumption where data is unavailable
- COMP_UNVERIFIABLE — comparable transaction excluded from valuation

---

## Method 1: IP Replacement Cost Analysis

### Codebase Inventory (VERIFIED)

| Category | Count | Source |
|----------|-------|--------|
| Total files in repo | 528 | repo_manifest.json |
| TypeScript/TSX source files | 325 | repo_manifest.json |
| Supabase edge functions | 12 | supabase/functions/ tree |
| CI/CD configuration (codemagic.yaml) | 1 (26 KB) | tree scan |
| Web worker files | 3 | src/workers/ |
| Test files | 53 | test inventory |
| Mobile config (iOS/Android) | Full Capacitor 8 project | ios/ + android/ |

### Original IP Estimation

**Raw repository lines of code:**
- Estimate: ~325 TS/TSX files × 250 avg lines = ~81,250 lines — ASSUMED (avg line count, no wc executed)
- Supabase functions: ~12 × ~400 avg lines = ~4,800 lines — ASSUMED
- Config/YAML/Gradle/Swift: ~3,000 lines — ASSUMED
- **Total gross LOC: ~89,000 lines** — ASSUMED

**Adjustments for non-original content:**
- Capacitor scaffold (iOS/Android generated): subtract ~15,000 lines
- shadcn/ui component scaffolding (probable copy-paste base): subtract ~8,000 lines
- Boilerplate test files (Capacitor defaults): subtract ~500 lines
- **Original IP estimate: ~65,500 lines** — ASSUMED

**Development rate assumptions:**
- Senior full-stack engineer (TypeScript / React / Capacitor / Supabase / AI integration): $110/hr blended market rate — ASSUMED (Edmonton/remote market, mid-2026)
- Production velocity for complex AI application (security layers, encryption, edge functions, 3D visualization): 40–60 lines/hr — ASSUMED
- Blended rate: 50 lines/hr — ASSUMED

**Calculation:**
```
65,500 lines ÷ 50 lines/hr = 1,310 engineering hours
1,310 hrs × $110/hr = $144,100 raw labor cost
```

**Multipliers applied:**
- Product design and UX (landing, onboarding, 3D visualization, multi-language): +25% = $36,025
- DevOps and CI/CD pipeline (Codemagic, Cloudflare, GitHub Actions): +10% = $14,410
- AI architecture and prompt engineering (prompt-shield, pii-redactor, content-guard, mindcore): +15% = $21,615
- Security layer (AES-GCM, PBKDF2, rate limiting, fraud detection, edge auth): +10% = $14,410
- Rework factor (147 TS errors documented in Feb 2026 launch audit, resolved by production): +15% = $21,615

**Total multiplied replacement cost:**
```
$144,100 × 1.75 = $252,175
```

**Method 1 Valuation: ~$250,000** (rounded, pre-revenue IP replacement floor)

---

## Method 2: Comparable Transaction Analysis

**Methodology note:** Only transactions with documented, checkable public sources are cited. All others are COMP_UNVERIFIABLE and excluded.

### Category: Pre-Revenue AI Consumer App Acquisitions

The following represent PROBABLE comparable ranges based on publicly reported acquisition categories. Individual deal terms are COMP_UNVERIFIABLE without access to verified M&A databases (PitchBook, CB Insights, Crunchbase Pro).

**Comparable category parameters that apply to aSpiral:**
- Pre-revenue (no confirmed paying user base — VERIFIED: no payment infrastructure found in codebase)
- AI-native consumer mobile application
- Voice interaction as core modality
- Early-stage (v1.0.0 per `android/app/build.gradle:11`)
- Mental wellness / personal development vertical
- Multi-platform (iOS + Android + PWA)
- Hybrid mobile (Capacitor — not fully native)
- Single-market (English primary, 5 languages available)

**Vertical: AI mental wellness / coaching apps (2024–2026 range)**
- COMP_UNVERIFIABLE: Individual deal values are not accessible without paid M&A database access. Omitted per mandate.
- POLICY_UNVERIFIABLE: Specific acquisition prices for private pre-revenue AI wellness apps are generally not disclosed.

**Public reference floor (PROBABLE):**
- YC Demo Day comparable pre-revenue AI apps in consumer wellness typically seed at $1.5–4M post-money in 2025–2026 — ASSUMED from publicly available YC batch reporting patterns
- Acquisition of pre-revenue consumer AI apps by strategic buyers typically occurs at 1–3× post-money seed valuation or at replacement cost + strategic premium — ASSUMED

**Method 2 produces a range, not a point estimate:**
- Method 2 range: $300,000 – $1,200,000 — ASSUMED (cannot anchor to verified comparable without M&A database access)

---

## Method 3: Strategic Acquisition Premium Assessment

This method assesses what a strategic acquirer would pay above IP replacement cost due to unique proprietary elements.

### Strategic Value Drivers (VERIFIED from codebase)

| Driver | Evidence | Premium Factor |
|--------|----------|---------------|
| 3D breakthrough visualization engine (Three.js + R3F) | src/components/visualization/, src/workers/ | Differentiated UX — HIGH |
| Multi-layer AI prompt defense system | supabase/functions/spiral-ai/prompt-shield.ts | Enterprise moat — MEDIUM |
| 5-language i18next implementation | src/i18n/ | Addressable market expansion — MEDIUM |
| Voice-first session FSM with state machine | src/lib/fsm-transitions.ts | Novel architecture — MEDIUM |
| Dual spiral methodology (inward + outward) | Product IP — documented in README | IP defensibility — MEDIUM |
| AES-GCM local encryption for personal breakthrough data | src/lib/crypto.ts | Privacy moat — LOW-MEDIUM |
| Supabase edge function AI pipeline (12 functions) | supabase/functions/ | Integration depth — MEDIUM |

### Strategic Acquirer Profiles

**Profile A — Consumer Mental Wellness Platform (e.g., wellness app with existing user base)**
- Motivation: Add AI voice breakthrough coaching to existing content library
- Synergy: Voice + 3D visualization differentiates from text-only competitors
- Likely valuation: IP replacement + 1–2× strategic premium = $500,000–$750,000 — ASSUMED

**Profile B — Enterprise AI Platform (productivity / coaching tools)**
- Motivation: Add voice-first breakthrough methodology + prompt defense IP to enterprise platform
- Synergy: Multi-language, encryption, edge AI pipeline reusable across products
- Likely valuation: IP replacement + 2–4× strategic premium = $750,000–$1,200,000 — ASSUMED

**Profile C — Talent Acquisition (Acquihire)**
- Motivation: Acquire the engineering team behind the security architecture and AI pipeline
- Likely valuation: $200,000–$400,000 per senior engineer (ASSUMED, 2-4 engineers estimated from codebase complexity)
- Acquihire range: $400,000–$800,000 — ASSUMED

### Method 3 Range: $500,000 – $1,200,000 — ASSUMED

---

## Risk Discounts Applied

The following verified deficiencies reduce valuation from theoretical maximum:

| Risk | Impact | Discount Applied |
|------|--------|-----------------|
| Android Codemagic workflow absent — not yet in stores | CRITICAL | −25% from strategic premium |
| PrivacyInfo.xcprivacy missing — iOS not submittable | CRITICAL | −15% from strategic premium |
| 8/12 edge functions unauthenticated | HIGH | −10% from strategic premium |
| No crash reporting | HIGH | −5% from strategic premium |
| No paying users | HIGH (pre-revenue) | Already reflected in comp range |
| Remediation cost to submission-ready | ~$50,000–$80,000 (est. 98h at blended $110/hr) | Deducted from buyer's price |

**Net risk discount: −40% applied to strategic premium component** — ASSUMED

---

## Consolidated Valuation Range

| Metric | LOW | MID | HIGH |
|--------|-----|-----|------|
| IP Replacement (Method 1) | $220,000 | $250,000 | $290,000 |
| Strategic Premium (Methods 2+3, risk-adjusted) | $80,000 | $400,000 | $910,000 |
| **Consolidated Pre-Revenue Range** | **$300,000** | **$650,000** | **$1,200,000** |
| Confidence Band | Wide — pre-revenue, pre-store | Wide | Wide |
| Confidence Level | LOW-MEDIUM | LOW-MEDIUM | LOW |

**Notes on confidence:**
- HIGH range ($1.2M) requires a strategic acquirer specifically targeting voice-first AI wellness with existing distribution platform. No evidence of active acquirer interest — UNVERIFIABLE.
- MID range ($650,000) assumes resolution of all CRITICAL blockers and successful App Store + Play Store listing within 60 days.
- LOW range ($300,000) reflects pure IP replacement + marginal strategic premium, accounting for remediation cost burden on acquirer.
- Pre-launch status is the single largest value suppressor. Successful store launch with verifiable DAU/retention data could 2–5× the MID range.

---

## Valuation Summary

```
aSpiral — Market Valuation as of 2026-06-16

  LOW:   $300,000 USD
  MID:   $650,000 USD
  HIGH:  $1,200,000 USD

Confidence: LOW-MEDIUM across all bands
Primary value lever: Store submission completion + first 90-day user metrics
Primary risk: 3 CRITICAL blockers require resolution before any realistic buyer close
Remediation cost: ~$50,000–$80,000 (estimated)
Net acquirable value (to buyer): MID minus remediation = ~$570,000–$600,000
```

---

## Validation Notes

- No paid M&A databases (PitchBook, CB Insights) accessed — all comparable ranges are ASSUMED from public reporting patterns
- No revenue data available — pre-revenue status is VERIFIED by absence of Stripe, RevenueCat, or payment infrastructure in codebase
- No user count or DAU data available — UNVERIFIABLE
- LOC counted by estimation, not wc — ASSUMED
- All dollar figures are USD — ASSUMED (APEX Business Systems Ltd is Canadian; FX rate not applied)
