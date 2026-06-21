---
date: 2026-06-21
scope: apps/omnihub-site
status: partial-validation
---

# OmniHub Site i18n Language Switcher Fix

Implemented a surgical public-site i18n repair for the production language switcher:

- Centralized locale metadata and locale resolution in `apps/omnihub-site/src/i18n/locales.ts`.
- Hardened `i18n` initialization to sync `html lang`, `dir`, and `localStorage.apex_locale` on language changes.
- Converted primary layout and home-page marketing copy to JSON-backed translations.
- Replaced the app i18n checker so it validates `apps/omnihub-site/src/i18n/locales/*.json` rather than root dictionaries.
- Replaced skipped/todo translation guard tests with active Vitest and Playwright coverage.

Validation notes:

- `npm run i18n:check`: pass.
- `npx vitest run tests/omnidash/translation-realness.spec.tsx`: pass.
- `npx playwright test tests/e2e-playwright/verify-translation-ui.spec.ts --project=chromium --config=playwright.config.ts`: pass after installing Playwright browsers/deps.
- `cd apps/omnihub-site && npm run typecheck`: blocked by pre-existing root `src/omnidash/useOmniDashAction.ts` alias/implicit-any errors outside this patch.
- `cd apps/omnihub-site && npm run lint`: blocked by pre-existing hook lint errors in `src/hooks/usePWAInstall.ts` and `src/hooks/useSpeechRecognition.ts` outside this patch.
- `cd apps/omnihub-site && npm run build`: client build succeeds, SSG server build blocked on Node 20 missing native WebSocket; repo engine requires Node >=22.
- `cd apps/omnihub-site && npm run smoke`: blocked by pre-existing smoke fixture expectations for missing `.html` files/legacy strings.

Residual risk: Japanese, Simplified Chinese, and Brazilian Portuguese locale resources now change visibly and pass guardrails, but need native-speaker copy review before claiming final production translation quality.
