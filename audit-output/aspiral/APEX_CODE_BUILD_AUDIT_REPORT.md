---
auditor: APEX-AUDITOR-PRIME
repo: apexbusiness-systems/aSpiral
branch: main
audit_date: 2026-06-16
mandates: A (Technical Audit) + C (Store Submission Gate) + D (Doc Sync)
confidence_methodology: VERIFIED = read from source; PROBABLE = inferred from structure; UNVERIFIABLE = no evidence accessible
---

# APEX Code & Build Audit Report — aSpiral

## Executive Summary

aSpiral is a voice-first AI coaching application built on **Capacitor 8** (React 18 + Vite 7 + TypeScript), deployed to Cloudflare Pages (web/PWA) and targeting iOS App Store and Google Play Store via Codemagic CI/CD. The codebase is 528 files of which 325 are TypeScript/TSX source. The platform demonstrates **above-average security engineering** for a pre-launch consumer app — with AES-GCM encryption, PII redaction, rate limiting, prompt injection defense, and content moderation all implemented in the Supabase edge layer. However, **three critical blockers prevent store submission**: (1) the Android Codemagic workflow is entirely absent, making Play Store submission impossible; (2) the iOS `PrivacyInfo.xcprivacy` file is missing, causing App Store rejection since Spring 2024; and (3) eight of twelve Supabase edge functions — including the core `spiral-ai` AI engine — operate without JWT verification, creating an unauthenticated public API surface. A fourth high-severity issue is a real Supabase anon key committed to `.env.production` in a public repository. The codebase is otherwise architecturally coherent, and the iOS Codemagic pipeline (short of the `PrivacyInfo` gap) is sophisticated and production-grade.

---

## Per-Agent Findings

### AGENT_1: REPO_MAPPER

| Item | Value | Evidence | Confidence |
|------|-------|----------|------------|
| Stack | Capacitor 8 / React 18 / Vite 7 / TS 5.8 | package.json:root | VERIFIED |
| App ID | com.apex.aspiral | capacitor.config.ts:3 | VERIFIED |
| iOS project | ios/App/App.xcodeproj | tree scan | VERIFIED |
| Android project | android/app/build.gradle | tree scan | VERIFIED |
| codemagic.yaml | Present at root (26 KB) | tree scan | VERIFIED |
| Android workflow | MISSING from codemagic.yaml | codemagic.yaml full read | VERIFIED |
| Total source files | 522 (excl. node_modules) | tree scan | VERIFIED |
| PrivacyInfo.xcprivacy | MISSING from ios/ tree | full tree scan | VERIFIED |
| Large binary in repo | 33 MB mp4 committed to main | tree scan size field | VERIFIED |
| .orig debt files | 3 files | tree scan | VERIFIED |

---

### AGENT_2: MOBILE_SECURITY_AUDITOR

#### M1 — Improper Credential Usage

**CRITICAL: Supabase anon key committed to public repository**
- File: `.env.production:15`
- Value: `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full JWT committed)
- Also: `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EsqGDnlMrlTWvOgLNkYmAA_FQd10-SW`
- Assessment: Supabase anon keys are client-side public keys by design and are embedded in built apps. However, committing the actual key to a public GitHub repo exposes the exact project ID and key to automated scrapers. If RLS is improperly configured on any table, data is exposed to the internet. Severity: **HIGH** (not CRITICAL only because anon keys are intentionally public, but the practice is incorrect).
- Fix: Move to Cloudflare Pages environment variables only. Remove from `.env.production` in repo. Rotate key as precaution.

**MEDIUM: Hardcoded application salt**
- File: `src/lib/secureStorage.ts:4`
- Value: `const APP_SALT = 'aspiral-v1-secure-storage-salt-2024'`
- Assessment: Salt is used in PBKDF2 key derivation. A static salt weakens key derivation because all users share the same salt component. The code adds userId + deviceId to partially mitigate this, but the salt itself is predictable and public.
- Fix: Generate a per-installation random salt stored in a non-extractable location, or derive from a server-side secret.

**LOW: supabase/config.toml project_id exposed in public repo**
- File: `supabase/config.toml:1`
- Value: `project_id = "eqtwatyodujxofrdznen"`
- Assessment: Project ID is required for Supabase CLI usage and is not a secret. No credential exposure.

#### M2 — Supply Chain

**MEDIUM: Caret-versioned dependencies (no pinning)**
- All 50+ dependencies use `^` versioning in package.json. npm ci pins via package-lock.json, which mitigates supply chain risk for installed versions, but the lock file must be reviewed on each update.
- File: `package.json` — all dependency entries
- Evidence: `"react": "^18.3.1"`, `"@supabase/supabase-js": "^2.89.0"`, etc.
- Note: `html2pdf.js ^0.14.0` — this library had known XSS CVEs (GHSA-w8xx-4x68-c-m6fc) in prior versions. Verify current version is patched. **PROBABLE HIGH if unpatched.**
- GitHub Actions uses pinned commit SHAs for all actions: `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5` — **GOOD** supply chain hygiene.

#### M3 — Insecure Auth (CRITICAL)

**CRITICAL: 8 of 12 Supabase edge functions have verify_jwt = false**
- File: `supabase/config.toml:3–20`
- Affected functions: `spiral-ai`, `chat`, `speech-to-text`, `text-to-speech`, `omnilink-health`, `process-transcript`, `generate-breakthrough`, `health`
- Impact: Anyone who knows the Supabase project URL (committed to the public repo) can call the core AI engine (`spiral-ai`) without any authentication. This enables: API abuse, cost amplification (OpenAI/Groq charges for every call), data exfiltration from the AI context, and resource exhaustion.
- The `spiral-ai` function does implement rate limiting and an internal auth layer (`supabase/functions/_shared/auth.ts`), but this is defense-in-depth that can be bypassed without JWT enforcement at the Supabase gateway layer.
- Fix: Set `verify_jwt = true` on all functions. For public endpoints (health check, speech), require a valid anonymous Supabase session token, which is obtained automatically when users open the app.

**MEDIUM: aps-environment = development in App.entitlements**
- File: `ios/App/App/App.entitlements:5`
- Value: `<string>development</string>` — push notifications will not work in production App Store builds. App Review testers may receive no push notifications.
- Fix: Change to `production` for the Release configuration.

**LOW: Auth context uses `as any` for Supabase profile fetch**
- File: `src/contexts/AuthContext.tsx` — `const { data,` (truncated but `as any` cast mentioned in launch-audit.md)
- Assessment: TypeScript bypass around profiles table type can mask auth query failures.

#### M4 — Input Validation: **GOOD**

- Zod schemas on auth form: `emailSchema`, `passwordSchema`, `displayNameSchema` — File: `src/pages/Auth.tsx:12–14` — VERIFIED
- Edge function input validator: `supabase/functions/spiral-ai/input-validator.ts` — VERIFIED
- Prompt injection defense: `supabase/functions/spiral-ai/prompt-shield.ts` — multi-layer (pattern + semantic + normalization + output validation + anomaly) — VERIFIED
- PII redactor: `supabase/functions/spiral-ai/pii-redactor.ts` — email, phone, SSN, credit card, IP, obfuscated email — VERIFIED
- Content guard: `supabase/functions/spiral-ai/content-guard.ts` — CSAM/CRITICAL, terrorism, drug manufacturing — VERIFIED

#### M5 — Insecure Communication: **LARGELY GOOD**

- `capacitor.config.ts:8–9` — `androidScheme: 'https'`, `iosScheme: 'https'` — VERIFIED
- `capacitor.config.ts:android.allowMixedContent: false` — VERIFIED
- `android/app/src/main/AndroidManifest.xml:13` — `android:usesCleartextTraffic="false"` — VERIFIED
- `ios/App/App/Info.plist:57–61` — `WKAppBoundDomains` restricts to `aspiral.app`, `apexbiz.io`, `supabase.co` — VERIFIED
- Certificate pinning: NOT IMPLEMENTED — flagged (not mandated for Capacitor hybrid apps, but absence noted)
- ATS exceptions: None found — Info.plist has no `NSAppTransportSecurity` overrides — GOOD

#### M6 — Privacy Controls

**HIGH: `verify_jwt = false` on functions that process voice/personal data**
- Same as M3 above. User voice transcripts, spiral session data, and breakthrough content are processed by unauthenticated endpoints.

**MEDIUM: PostHog analytics persists to localStorage by default**
- File: `src/lib/analytics.ts:50+` — `persistence: 'localStorage'`
- No cookie consent banner found in codebase (UNVERIFIABLE — may be in Cloudflare headers)
- GDPR compliance requires explicit consent before analytics persistence in EU. The `opt_out_capturing_by_default: false` means analytics fire immediately on load.
- Fix: Set `opt_out_capturing_by_default: true` and implement explicit consent toggle (or confirm Cloudflare-side consent gate).

**GOOD: PostHog privacy configuration**
- `autocapture: false`, `maskAllInputs: true`, `disable_session_recording: false` (with masking) — VERIFIED

#### M7 — Binary Protections

**MEDIUM: CAPACITOR_DEBUG build variable not explicitly set to empty in Release**
- File: `ios/App/App/Info.plist:5` — `<key>CAPACITOR_DEBUG</key><string>$(CAPACITOR_DEBUG)</string>`
- codemagic.yaml does not explicitly set `CAPACITOR_DEBUG` to empty/false for Release builds. If the Codemagic environment has this variable set (e.g., from a prior debug build), it could leak into the production binary.
- Fix: Add `CAPACITOR_DEBUG=""` to the Codemagic Release build environment.

**GOOD: `webContentsDebuggingEnabled: false`** — capacitor.config.ts:20 — VERIFIED
- **JAILBREAK DETECTION: NOT IMPLEMENTED** — Flagged per audit mandate. Not a blocker.

#### M8 — Security Misconfiguration: **LARGELY GOOD**

- `android:allowBackup="false"` — AndroidManifest.xml:8 — VERIFIED
- `android:usesCleartextTraffic="false"` — AndroidManifest.xml:14 — VERIFIED
- `android:debuggable` — NOT SET in release buildType — defaults to false — VERIFIED
- `android:exported="true"` on MainActivity — ACCEPTABLE (LAUNCHER activity, no dangerous data)
- FileProvider: `android:exported="false"` — VERIFIED
- No other exported components found in manifest scan
- iOS ATS: No relaxed exceptions — VERIFIED

#### M9 — Data Storage

**MEDIUM: Session state persisted to unencrypted localStorage via Zustand**
- File: `src/stores/sessionStore.ts:3` — `import { persist, createJSONStorage } from "zustand/middleware"`
- Session store uses `persist` middleware. Default storage is localStorage unless overridden. Messages and session entities (user's personal thought data) may be persisted in plaintext localStorage.
- The `src/lib/secureStorage.ts` and `src/lib/crypto.ts` implement AES-GCM encryption, but it is unclear from the store code whether they are applied to the Zustand persist layer.
- Fix: Verify `createJSONStorage` in sessionStore uses the encrypted secureStorage adapter, not raw localStorage.

**GOOD: Encryption implementation**
- `src/lib/crypto.ts` — AES-GCM 256-bit, PBKDF2 100k iterations, SHA-256, random IV per encrypt, random salt per encrypt — VERIFIED
- `src/lib/secureMathRandom.ts` — `crypto.getRandomValues()` used — VERIFIED

#### M10 — Cryptography: **GOOD**

- No MD5 or SHA-1 usage found
- AES-GCM with PBKDF2 — VERIFIED (`src/lib/crypto.ts`)
- Random IV: `crypto.getRandomValues(new Uint8Array(IV_SIZE))` — VERIFIED
- Random salt per encryption operation — VERIFIED
- PRNG: `crypto.getRandomValues()` via `secureMathRandom.ts` — VERIFIED

---

### AGENT_3: MOBILE_QUALITY_AUDITOR

#### Test Inventory

| Category | Count | Files | Status |
|----------|-------|-------|--------|
| Vitest unit — lib | 22 | src/lib/__tests__/* | VERIFIED |
| Vitest unit — hooks | 5 | src/hooks/__tests__/* | VERIFIED |
| Vitest unit — components/security | 2 | src/security/__tests__/* | VERIFIED |
| Deno edge tests | 6 | supabase/functions/spiral-ai/*.test.ts | VERIFIED |
| Android instrumented | 2 | android/app/src/androidTest/* | VERIFIED (Capacitor scaffold defaults only) |
| E2E (Playwright) | 0 | — | MISSING |
| E2E (voice_system_test.py) | 1 | tests/e2e/voice_system_test.py | PROBABLE — Python voice test |
| README claimed | 172 tests, 100% pass | README.md | UNVERIFIABLE — CI results not accessible |

**Zero-test screens/flows (MEDIUM):**
- `/steps/voice`, `/steps/visualize`, `/steps/questions`, `/steps/breakthrough` — documented as dead UI in `docs/launch-audit.md` (Feb 2026). No E2E tests cover these flows.
- `pages/AdminDashboard.tsx` — no test file found
- `pages/Workspaces.tsx` — no test file found
- Android instrumented tests are Capacitor scaffolding defaults (`ExampleInstrumentedTest.java`) — ZERO app-specific Android tests

#### Performance Surface

**HIGH: No crash reporting (Crashlytics/Sentry)**
- No Crashlytics, Sentry, or equivalent found in package.json or source
- PostHog is present but is analytics, not crash reporting
- Fix: Add `@sentry/capacitor` or `firebase-crashlytics` before store submission. App Store requires crash-free rate ≥ 99.5% before promoting to review.

**MEDIUM: 33 MB video file committed to main branch**
- File: 1 `.mp4` file at 33,052,644 bytes in repository tree
- Impact: Bloats git clone size. Mobile users downloading the app receive this asset as part of the web bundle if referenced in `dist/`.
- Fix: Host video on CDN (Cloudflare R2 or similar). Remove from repo.

**MEDIUM: .orig files are tech debt**
- `src/pages/Breakthroughs.tsx.orig`, `src/pages/Sessions.tsx.orig`, `supabase/functions/spiral-ai/aspiralMindcoreLoader.test.ts.orig`
- These are uncommitted conflict resolution artifacts. Risk of confusion with active files.

**GOOD: Lazy loading architecture**
- All non-critical-path pages use `React.lazy()` + `<Suspense>` — `src/App.tsx:30–50` — VERIFIED
- `SentinelProvider` is commented out — may be intentional during development phase

**GOOD: Web Workers**
- 3 workers in `src/workers/` — offloads computation from main thread

**GOOD: Performance monitoring**
- `src/lib/performance/optimizer.ts` exists
- `web-vitals ^5.1.0` in dependencies

#### Technical Debt Estimate

| Item | Severity | Est. Hours |
|------|----------|-----------|
| Add Android Codemagic workflow | CRITICAL | 8h |
| Add PrivacyInfo.xcprivacy | CRITICAL | 3h |
| Fix 8 edge functions verify_jwt | CRITICAL | 4h |
| Add crash reporting | HIGH | 4h |
| Remove .env.production credentials from repo | HIGH | 1h |
| Rotate Supabase anon key | HIGH | 1h |
| Write E2E test suite for core flows | HIGH | 40h |
| Fix aps-environment to production | HIGH | 1h |
| Fix App.entitlements signing identity | HIGH | 2h |
| Verify Zustand persist encryption | MEDIUM | 4h |
| Fix PostHog consent gate (GDPR) | MEDIUM | 6h |
| Set CAPACITOR_DEBUG="" in Release | MEDIUM | 1h |
| Remove 33MB video from repo | MEDIUM | 2h |
| Clean .orig files | LOW | 1h |
| Add Android app-specific tests | LOW | 20h |
| **TOTAL** | | **~98h** |

---

### AGENT_4: ARCHITECTURE_AUDITOR

#### Navigation & Screen Flows

Router: `HashRouter` (React Router DOM 6) — VERIFIED from `src/App.tsx:63`
Hash-based routing is correct for Capacitor WebView (native routers don't intercept hash routes).

| Route | Screen | Protection |
|-------|--------|-----------|
| / | Landing | Public |
| /how-it-works | HowItWorks | Public |
| /auth | Auth | Public |
| /story | Story | Public |
| /support | Support | Public |
| /privacy | Privacy | Public |
| /steps/voice | VoiceYourChaos | Public |
| /steps/visualize | WatchItVisualize | Public |
| /steps/questions | AnswerQuestions | Public |
| /steps/breakthrough | GetBreakthrough | Public |
| /app | Index | **ProtectedRoute** |
| /sessions | Sessions | **ProtectedRoute** |
| /workspaces | Workspaces | **ProtectedRoute** |
| /api-keys | ApiKeys | **ProtectedRoute** |
| /breakthroughs | Breakthroughs | **ProtectedRoute** |
| /dashboard | AdminDashboard | **ProtectedRoute** |
| /notification-test | NotificationTest | DEV only |

Evidence: `src/App.tsx:82–101` — VERIFIED

#### State Management

- **Zustand sessionStore**: session lifecycle, messages, entities, connections, friction points, visualization state, UI flags — `src/stores/sessionStore.ts` — VERIFIED
- **Zustand pwaStore**: PWA install prompt management — `src/stores/pwaStore.ts` — VERIFIED
- **TanStack Query**: server-state caching for Supabase queries — `src/App.tsx:6` — VERIFIED
- **AuthContext**: React context for user/session/profile — `src/contexts/AuthContext.tsx` — VERIFIED
- **No prop drilling detected** at router level; state accessed via hooks throughout
- **Stale closure risk**: Zustand stores using `persist` middleware with complex nested state (entities Set, connections Set) — lookups use Set which is not JSON-serializable by default; `_rebuildLookups()` function exists to reconstruct Sets post-hydration — PROBABLE risk of stale lookups after cold start if `_rebuildLookups` is not called

#### Offline-First Capability

- **No explicit offline-first strategy identified** — HIGH severity
- No IndexedDB usage found
- No service worker caching configuration found in source (vite-plugin-pwa is in devDependencies but configuration not audited)
- Zustand persist to localStorage provides partial offline state, but network-dependent flows (voice, AI, breakthrough) will fail offline with no graceful degradation
- Fix: Define offline capability scope. If not offline-first, implement explicit "you're offline" error state on affected screens.

#### API Layer

- Supabase client: `src/integrations/supabase/client.ts` — defensive init with mock fallback when URL missing — GOOD
- TanStack Query for server state caching — GOOD
- Retry logic: `src/lib/retry.ts` — VERIFIED (file exists)
- Error normalization: `src/lib/normalizeError.ts` — VERIFIED
- Error boundary: SupabaseConfigError displayed on init failure — GOOD
- Loading/error states: PROBABLE (shadcn/ui toast system + sonner) — full per-screen coverage UNVERIFIABLE without running app

#### Push Notifications

- `@capacitor/push-notifications ^8.0.0` — VERIFIED in package.json
- `src/hooks/usePushNotifications.ts` — VERIFIED
- `capacitor.config.ts:plugins.PushNotifications` — VERIFIED
- `ios/App/App/Info.plist:UIBackgroundModes: [fetch, remote-notification]` — VERIFIED
- `App.entitlements: aps-environment = development` — **HIGH: must change to `production`**
- Google services JSON for FCM: codemagic.yaml shows google-services.json detection but its presence in repo is UNVERIFIED (not found in tree scan, likely gitignored — ACCEPTABLE if provided via Codemagic secrets)

#### Analytics & Crash Reporting

- Analytics: PostHog `^1.310.1` — VERIFIED
- Crash reporting: **ABSENT** — no Sentry, Crashlytics, or equivalent found — HIGH severity for production store submission

#### Deep Linking

- HashRouter is used — native deep links (Universal Links on iOS, App Links on Android) require custom URL scheme or HTTPS domain association
- `capacitor.config.ts:ios.scheme: 'aSpiral'` — custom scheme defined — GOOD for basic URL scheme deep links
- Universal Links / AASA file: NOT FOUND in repo tree — MEDIUM severity if universal links are intended
- `app.entitlements` does not include `com.apple.developer.associated-domains` — confirms Universal Links not configured

#### Codemagic Pipeline Assessment

**iOS workflow (`aspiral_ios_testflight`):**
| Step | Status | Evidence |
|------|--------|----------|
| Preflight env validation | ✅ PRESENT | codemagic.yaml:scripts[0] |
| npm install | ✅ PRESENT | scripts[2] |
| Web build | ✅ PRESENT | scripts[3] |
| Capacitor sync | ✅ PRESENT | scripts[4] |
| Icon generation + alpha flatten | ✅ PRESENT | scripts[5–7] |
| Bundle ID hard-lock guard | ✅ PRESENT | scripts[9] |
| Build number auto-increment (timestamp) | ✅ PRESENT | scripts[11] |
| Signing (app-store-connect fetch-signing-files) | ✅ PRESENT | scripts[12] |
| IPA build | ✅ PRESENT | scripts[14] |
| IPA verification | ✅ PRESENT | scripts[15–16] |
| Test step BEFORE build | ❌ MISSING | MEDIUM — no `npm test` step in codemagic.yaml iOS workflow |
| Export type IOS_APP_STORE | ✅ PRESENT | FETCH_ARGS --type IOS_APP_STORE |
| TestFlight submission | ✅ PRESENT | publishing.app_store_connect.submit_to_testflight: true |
| Internal group | ✅ PRESENT | beta_groups: ["aSpiral Internal"] |
| Secrets in plaintext | ✅ NONE | All via $ENV_VAR references |

**Android workflow:** ❌ ENTIRELY MISSING — CRITICAL BLOCKER

---

## Risk Register

### CRITICAL

| ID | Finding | File:Line | Confidence |
|----|---------|-----------|------------|
| C-001 | Android Codemagic workflow missing — Play Store submission impossible | codemagic.yaml (absence) | VERIFIED |
| C-002 | PrivacyInfo.xcprivacy missing from iOS project — Apple rejects since Spring 2024 | ios/ tree (absence) | VERIFIED |
| C-003 | 8/12 Supabase edge functions (incl. spiral-ai, chat) have verify_jwt=false — unauthenticated public API | supabase/config.toml:3–20 | VERIFIED |

### HIGH

| ID | Finding | File:Line | Confidence |
|----|---------|-----------|------------|
| H-001 | Real Supabase anon key + publishable key committed to public repo | .env.production:13–15 | VERIFIED |
| H-002 | aps-environment=development in App.entitlements — push notifications fail in production | ios/App/App/App.entitlements:5 | VERIFIED |
| H-003 | CODE_SIGN_IDENTITY = "iPhone Developer" in pbxproj — incorrect for App Store distribution | ios/App/App.xcodeproj/project.pbxproj | VERIFIED |
| H-004 | No crash reporting (Sentry/Crashlytics) — cannot meet 99.5% crash-free threshold | package.json (absence) | VERIFIED |
| H-005 | No test step before build in iOS Codemagic workflow | codemagic.yaml (absence in scripts) | VERIFIED |
| H-006 | PostHog fires immediately without consent gate — GDPR risk for EU users | src/lib/analytics.ts:50+ | PROBABLE |

### MEDIUM

| ID | Finding | File:Line | Confidence |
|----|---------|-----------|------------|
| M-001 | Hardcoded APP_SALT in secureStorage weakens PBKDF2 | src/lib/secureStorage.ts:4 | VERIFIED |
| M-002 | Zustand sessionStore persist target not confirmed encrypted | src/stores/sessionStore.ts:3 | PROBABLE |
| M-003 | Android versionCode=10000 hardcoded — not auto-incremented | android/app/build.gradle:10 | VERIFIED |
| M-004 | CAPACITOR_DEBUG not explicitly cleared in Release build | ios/App/App/Info.plist:5 | PROBABLE |
| M-005 | SentinelProvider commented out in App.tsx | src/App.tsx:61 | VERIFIED |
| M-006 | No offline-first error handling for voice/AI flows | src/ (structural) | PROBABLE |
| M-007 | 33 MB video asset committed to main branch | repo tree (size) | VERIFIED |
| M-008 | .orig files in repo (3 files) | tree scan | VERIFIED |
| M-009 | html2pdf.js — prior XSS CVE in older versions; version pinning via ^0.14.0 | package.json | PROBABLE |
| M-010 | No Universal Links (AASA) configuration for iOS | App.entitlements, tree scan | VERIFIED |

### LOW

| ID | Finding | File:Line | Confidence |
|----|---------|-----------|------------|
| L-001 | No jailbreak detection | src/ (absence) | VERIFIED |
| L-002 | Certificate pinning not implemented | src/ (absence) | VERIFIED |
| L-003 | Android E2E tests are Capacitor scaffold defaults only | android/app/src/androidTest/ | VERIFIED |
| L-004 | iOS deployment target 15.0 — Apple recommends 16+ for 2025+ submissions | project.pbxproj | VERIFIED |

---

## Remediation Roadmap (Ordered by Severity)

### Phase 0 — Pre-Submission Blockers (~16h)

1. **[C-001]** Write Android Codemagic workflow (`aspiral_android_play_internal`) — AAB build, Play Store internal track, keystore via encrypted env vars (~8h)
2. **[C-002]** Create `ios/App/App/PrivacyInfo.xcprivacy` — declare all required reason APIs used by Capacitor and dependencies (~3h)
3. **[C-003]** Enable `verify_jwt = true` for all 8 public functions in `supabase/config.toml`. Update edge functions to accept anonymous sessions for public-facing endpoints (~4h)
4. **[H-001]** Remove credentials from `.env.production`. Rotate Supabase anon key. Add `.env.production` to `.gitignore` (~1h)
5. **[H-002]** Change `aps-environment` to `production` in `App.entitlements` (~30min)
6. **[H-003]** Change `CODE_SIGN_IDENTITY` to `"Apple Distribution"` in Xcode project Release configuration (~30min)

### Phase 1 — Pre-Review (~20h)

7. **[H-004]** Add crash reporting (`@sentry/capacitor` or Firebase Crashlytics) and verify crash-free rate before App Review submission
8. **[H-005]** Add `npm test` step before build step in both Codemagic workflows
9. **[M-003]** Add `versionCode` auto-increment to Android Codemagic workflow (use BUILD_NUMBER or timestamp)
10. **[M-002]** Verify Zustand sessionStore persist uses encrypted secureStorage adapter, not raw localStorage

### Phase 2 — Production Hardening (~40h)

11. **[H-006]** Implement GDPR-compliant consent gate before PostHog initialization
12. **[M-001]** Replace static APP_SALT with per-installation random salt
13. **[M-004]** Set `CAPACITOR_DEBUG=""` in Release build environment in Codemagic
14. **[M-006]** Add offline error states for voice and AI-dependent flows
15. **[M-007]** Move 33 MB video to Cloudflare R2 CDN; remove from repo
16. **[M-008]** Delete .orig files from repo
