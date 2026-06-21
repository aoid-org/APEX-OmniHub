# OmniHub i18n Language Switcher Fix — 2026-06-21

## Context
- PR #1450 attempted to localize the public language switcher but introduced a root typecheck ambiguity: app-local `@/i18n/locales` imports could resolve to the legacy root `src/i18n/locales.ts` because root `tsconfig.app.json` searches `./src/*` before `./apps/omnihub-site/src/*`.
- The safest remediation is to keep app-local i18n imports relative inside `apps/omnihub-site/src` and avoid reordering root aliases.

## Remediation notes
- `Layout.tsx` and `Home.tsx` now use relative imports for app-local i18n helpers.
- Missing-key handling no longer returns blank strings in production. Dev/test uses loud `⟦missing:key⟧`; production returns a visible diagnostic after English/default fallback paths.
- `useAppTranslation().tx()` now checks the selected locale first, then `en-US`, then `defaultValue`, then a visible diagnostic.
- Locale parity check still validates production JSON locale files and ignores intentional `.key` metadata when calculating same-as-English realness.
- Added `i18n-hardcoded-ui-check.mjs` to the root/app `i18n:check` command. It blocks ambiguous i18n imports, blank production missing-key handlers, fake locale prefixes, missing diagnostics, and reports hardcoded UI text as advisory findings.
- Removed fake `中文：`, `Português:`, and `日本語:` prefixed locale clones from `zh-CN`, `pt-BR`, and `ja-JP` JSON files.
- Expanded Playwright translation coverage across public app routes, reload persistence, html lang, modal visibility, raw key/missing marker leakage, and blank controls. Static `/manifesto` is checked for reachability because it intentionally hard-navigates to a standalone static asset.
- Updated `docs/APEX_AGENT_OPERATIONS.md` with the frontend i18n release gate required by ops-doc drift guard.

## Validation snapshot
- Passed: `npm run i18n:check`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test`, targeted Playwright translation spec, and root `npm run test:e2e:ci` (33 passed / 12 skipped in this environment).
- Screenshot evidence generated locally under `apps/omnihub-site/artifacts/i18n-remediation/` for desktop home per locale, request-access modal per locale, mobile nav open, `/omniport`, `/features/man-mode`, `/maestro`, and `/product/omnidash`.

## Residual risks
- The hardcoded UI check is intentionally advisory for broad public/OmniDash text because fully migrating every OmniDash/dashboard surface is a larger product translation effort. The advisory list identifies remaining candidate strings for follow-up.
- `/manifesto` remains a standalone static HTML manifesto and is not wired into React i18n; the route is checked for reachability rather than translation.
