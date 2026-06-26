# Production Certification Bridges — 2026-06-26

## Scope
Surgical hardening for OmniBoard, Automations, Billing, and PWA deploy proof.

## Decisions
- OmniBoard remains the only third-party app integration surface; proxy routes continue through `omnilink-port/omniboard-start` and `omnilink-port/omniboard-next`.
- Automations execute only `execute-automation` for exactly one selected live UUID. Demo/static IDs such as `auto-lead` fail closed in UI copy and are never sent to the Edge Function.
- Billing actions call the authenticated `create-billing-portal` Edge Function and redirect only to a returned `https://billing.stripe.com/...` URL. No mailto, alert, or hardcoded billing domains are valid production actions.
- PWA certification now checks source and built `dist/` artifacts, and deployed smoke checks include manifest, service worker, bundle registration, and OmniBoard edge-route reachability.

## Validation Notes
- Local typecheck, PWA guard, OmniDash guard, targeted Vitest suite, production build, and Cloudflare Pages contract passed.
- Live deployed bundle smoke could not complete from the container because Node `fetch` failed against the production domain while `curl -I https://apexomnihub.icu` returned 200. CI/deploy guard remains deterministic once run in the deploy environment.
