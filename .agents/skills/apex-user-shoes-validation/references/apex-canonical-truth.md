# APEX Canonical Product Truth

Use this reference for APEX-OmniHub, OmniDash, OmniBoard, Links, OmniSlate, module actions, and widget/modal rescue work.

## Non-negotiable product truth

### OmniBoard

OmniBoard is the user-facing UI endpoint for third-party app integration.

Clicking the OmniBoard sidebar widget must render the OmniBoard app-integration surface or modal. That surface contains the agent surface, including voice-agent interaction where supported, that asks the user what app, service, or provider they want to connect and executes the app-integration onboarding flow.

OmniBoard owns:
- third-party app integration onboarding;
- Connect AI / BYOM onboarding where applicable;
- provider or app identification;
- OAuth, API-key, device-code, or basic auth setup;
- connection verification;
- verified Connection Spec generation;
- app-integration agent and voice-agent interaction.

OmniBoard must not be reduced to a silent canvas-focus affordance. OmniBoard must not be launched from Links.

### Links

Links is independent from OmniBoard.

Links is a URL/link context widget. It lets users add, type, paste, save, select, and manage links or URLs they want to use as context. Links may hand selected URL context to OmniSlate or the agent context pipeline only when a real existing path is wired.

Links must not:
- open OmniBoard;
- open `omniboard-wizard`;
- say `Connect App`;
- say `Add Connection`;
- run third-party app integration onboarding;
- pretend saved links are connected integrations.

## Drift patterns to reject

Reject or correct any repo, prompt, test, or implementation that says or implies:
- OmniBoard sidebar is only a canvas-focus/home-scroll item;
- OmniBoard has `moduleKey: null` as product truth;
- Links opens OmniBoard;
- Links owns app integration;
- `add-link` means app connection;
- `Add Connection` belongs in Links;
- `Connect a Link` opens the app integration wizard;
- Links contains integration examples such as Salesforce, QuickBooks, GitHub, or Stripe unless they are explicitly URL/context records, not connected apps.

## Widget intent map

### OmniBoard
Expected job: app integration and connection agent surface.
Required pass condition: sidebar click opens the OmniBoard app-integration surface; the user can type or speak which app/provider to connect; unavailable backend states are actionable.

### Links
Expected job: link/URL context collection for OmniSlate or agent context.
Required pass condition: users can add or stage a link, see context-link state, and never get routed to OmniBoard.

### PhysiOmni
Expected job: physical operations, device status, and telemetry.
Required pass condition: device/telemetry actions work or are gated with device-backend copy.

### Audits
Expected job: governance, compliance, and security audit trail.
Required pass condition: audit actions work or are gated with audit-backend copy; no fake audit success.

### Automations
Expected job: automation rules, triggers, and execution logs.
Required pass condition: authoring/log actions work or explain missing automation runtime.

### Workflows
Expected job: workflow definitions, process studio, and run state.
Required pass condition: workflow creation/triggering routes to a real studio/runtime or is honestly unavailable.

### Files
Expected job: file and document operations.
Required pass condition: upload/delete/browse actions require a connected storage provider or show honest prerequisite copy.

### Billing
Expected job: subscription, usage, plan, invoice, and billing portal operations.
Required pass condition: billing actions route to a real billing integration or are disabled with billing-provider copy.

### Settings
Expected job: platform configuration and operational preferences.
Required pass condition: named settings render; no blank rows; save/reset feedback is visible; permission failures are clear.
