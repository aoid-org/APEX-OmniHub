# OmniBoard + Billing Widget Recovery — 2026-06-30

## Scope
Surgical recovery for the production OmniBoard app-connection surface and Billing Stripe subscription actions.

## Terminology locked
- OmniLink: application shell / mobile-first PWA / integration-bus experience.
- OmniPort: ingress/egress gateway engine for validation, normalization, idempotency, dispatch, observability, and controlled external communication.
- omnilink-port: Supabase Edge Function router/port implementation used by module-state, OmniBoard, OmniMedia, tasks/events/commands, and OmniPort-style routing.
- OmniBoard: third-party app integration/control surface.
- Billing: Stripe/subscription management surface, separate from OmniBoard, OmniLink, and OmniPort.

## Evidence summary
- Repo snapshot inspected at `82f6fcdf344e0cd847bf3868af9cf0a8dbaf397b` on branch `work`.
- Local Supabase CLI was unavailable, so functions list/logs/secrets could not be read from CLI in this environment.
- Unauthenticated live POSTs proved both `omnilink-port/omniboard-start` and `create-billing-portal` are deployed Edge Function surfaces and are not platform 404s; authenticated user-specific OmniBoard/Billing classifications remain owner-gated until a real user JWT is supplied.
- CORS preflights for both routes returned 204 with allowed origin `https://apexomnihub.icu`.

## Fix summary
- OmniBoardWizard now parses typed Edge Function response bodies for `connect_unavailable` / `connect_timeout` and keeps opaque Supabase transport text out of user copy.
- BillingModule now maps app-level `BILLING_CUSTOMER_NOT_FOUND` to honest setup copy, validates Stripe Billing Portal URLs, and offers existing `create-checkout` setup actions for Pro/Business using only validated Stripe Checkout URLs.
- `omnilink-port` billing module-state marks Stripe profile linked/not linked and only exposes billing portal actions when a `stripe_customer_id` exists.
