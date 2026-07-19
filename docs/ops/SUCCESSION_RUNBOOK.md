# APEX-OmniHub Bus-Factor Mitigation & Emergency Succession Runbook (`SUCCESSION_RUNBOOK.md`)

**Version:** 2026-07-16.v1  
**Owner:** APEX Leadership / `@sinyo`  
**Target:** Single-developer unavailability recovery, emergency hotfix execution, and continuity of operations.

---

## 1. Executive Summary & Purpose

APEX-OmniHub (`apexomnihub.icu`) operates under zero-failure reliability standards. To eliminate single-developer bus-factor vulnerability (`@sinyo` unavailability during a P0 incident or critical deployment), this runbook establishes exact operational sequences, verified credential locations, and emergency bypass procedures.

---

## 2. Complete Credential & Dashboard Inventory Checklist

All secrets, API tokens, and project references required for full control of the APEX-OmniHub control plane are stored securely.

### 2.1 Primary Master Credential File
*   **Path:** `C:\Users\sinyo\Desktop\ENV\APEX-OmniHub - ENV.md`
*   **Contents:** Contains master Cloudflare API tokens, Supabase service-role/database connection strings, Stripe secret keys, and GitHub admin personal access tokens.
*   **Protocol:** Any underscore escaped as `\_` in this document must be normalized to `_` before export into terminal or `.env` files.

### 2.2 Cloudflare Infrastructure Dashboard
*   **Portal:** `https://dash.cloudflare.com`
*   **Account ID:** `0b240ffb0c5cb86b7fa436ef872087eb`
*   **Domain Zone ID (`apexomnihub.icu`):** `50f28e6cdd5040669aa56ef982ed3ccf`
*   **Pages Project:** `apex-omnihub` (`apex-omnihub.pages.dev` redirected to `apexomnihub.icu`)
*   **Staging Slot:** `apex-omnihub-shadow.pages.dev`

### 2.3 Supabase Database & Auth Dashboard
*   **Portal:** `https://supabase.com/dashboard/project/c6b7ee9c-6a1a-4648-96ad-1eb956ac4e29`
*   **Project ID:** `c6b7ee9c-6a1a-4648-96ad-1eb956ac4e29` (Canonical production database & Auth host)
*   **API Reference:** `https://c6b7ee9c-6a1a-4648-96ad-1eb956ac4e29.supabase.co`

### 2.4 Stripe Billing Portal
*   **Portal:** `https://dashboard.stripe.com`
*   **Mode:** Live & Sandbox test endpoints configured for `/api/stripe/checkout`

---

## 3. Emergency Recovery Sequence (Single-Developer Unavailability)

If the primary maintainer (`@sinyo`) is unreachable during an active P0 incident, the designated emergency alternate or backup admin must execute the following protocol:

### Step 1: Secure Dashboard Access
1.  Locate `C:\Users\sinyo\Desktop\ENV\APEX-OmniHub - ENV.md` on the secure host or retrieve backup vault credentials.
2.  Authenticate to GitHub, Cloudflare, and Supabase using the master tokens.

### Step 2: Emergency Pull Request Review Bypass
1.  Create the hotfix branch from `main` (`git checkout -b hotfix/emergency-recovery`).
2.  If GitHub branch protection requires peer review and no secondary human reviewer is online, use the designated emergency account (`@apex-devops` / `@apex-emergency-ops`) or Ruleset bypass permissions specified in `.github/CODEOWNERS`.
3.  **Do not disable branch protection rules globally.** Use only the scoped bypass check box on the PR merge dialog, citing `SUCCESSION_RUNBOOK.md` in the commit audit log.

### Step 3: Rollback / Instant Recovery via Cloudflare Pages
If the live deployment (`apexomnihub.icu`) is failing:
1.  Navigate to **Cloudflare Dashboard → Workers & Pages → apex-omnihub → Deployments**.
2.  Locate the last known verified `A-grade` deployment (identified in `artifacts/production-validation/`).
3.  Click **Rollback to this deployment**. Instant traffic switch completes in <3 seconds without rebuilding code.

---

## 4. Local Offline Deployment & Hotfix Commands

To build, verify, and deploy a hotfix locally without waiting for CI runner availability:

### 4.1 Local Development & Clean Build
```bash
# Install exact pinned dependencies cleanly
npm ci

# Start local offline dev server for immediate verification
npm run dev

# Run mandatory smoke validation harness
npm run test:infra
npm run verify:ci-integrity

# Compile production Vite bundle into dist/
npm run build
```

### 4.2 Direct Emergency Deployment (Wrangler CLI)
If automated GitHub Actions deployment pipelines (`cd-staging.yml` / `cd-production.yml`) are blocked or unavailable:
```bash
# Export master token from C:\Users\sinyo\Desktop\ENV\APEX-OmniHub - ENV.md
set CLOUDFLARE_API_TOKEN=<CLOUDFLARE_AGENT_TOKEN>
set CLOUDFLARE_ACCOUNT_ID=0b240ffb0c5cb86b7fa436ef872087eb

# Deploy static bundle directly to production Cloudflare Pages project
npx wrangler pages deploy dist --project-name=apex-omnihub
```

---

## 5. Verification & Audit Trail

Every emergency succession action must be recorded by committing an incident summary artifact under `artifacts/production-validation/` immediately upon restoration of normal operations.
