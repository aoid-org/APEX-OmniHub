---
version: 1.0.1
last_audited: 2026-06-20
status: verified
---

# Correction — OmniBoard owns app integration; Links owns link/context input

Date: 2026-06-20
Scope: project-wide

## Corrected state

OmniBoard is the user-facing UI endpoint for third-party app integration. Clicking OmniBoard in the OmniDash sidebar opens the OmniBoard app-integration surface/modal containing the app-integration agent and voice-agent surface.

Links is an independent widget for collecting links/URLs as context for OmniSlate/agent workflows. Links does not open OmniBoard and is not responsible for app integration onboarding.

## Retired assumptions

- OmniBoard sidebar only focuses a persistent canvas.
- OmniBoard sidebar uses `moduleKey: null`.
- Links → add-link opens OmniBoard wizard.
- `Add Connection` belongs to Links.
- Links is the app-connect entry point.
