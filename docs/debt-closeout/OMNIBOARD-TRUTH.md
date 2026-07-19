# OmniBoard Architectural Truth

This document maps the files, components, and APIs that define the OmniBoard system and summarizes the current implementation status of Phase 1 (Track O).

---

## Absolute Repository-Relative Paths

1. **Router Registration for `/omniboard`**:
   - [apps/omnihub-site/src/App.tsx](file:///c:/Users/sinyo/OMNILINK-APEX%20HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub/apps/omnihub-site/src/App.tsx)
2. **OmniBoard Page Component**:
   - `apps/omnihub-site/src/pages/OmniBoard.tsx` (LOCKED: Managed in PR #1641)
3. **Integration Onboarder Component**:
   - `src/components/omnibridge/IntegrationOnboarder.tsx` (LOCKED: Managed in PR #1641)
4. **Integration Definitions & Registry**:
   - `src/omniconnect/core/registry.ts` (LOCKED: Managed in PR #1641)
5. **Connector Terminal UI Component**:
   - [src/components/ConnectorKit.tsx](file:///c:/Users/sinyo/OMNILINK-APEX%20HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub/src/components/ConnectorKit.tsx)
6. **OmniLink Create & Key Generation APIs**:
   - [src/omnidash/omnilink-api.ts](file:///c:/Users/sinyo/OMNILINK-APEX%20HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub/src/omnidash/omnilink-api.ts)
7. **Connector Adapters**:
   - [src/omniconnect/connectors/](file:///c:/Users/sinyo/OMNILINK-APEX%20HUB/APEX-OmniLink/APEX-OmniHub/APEX-OmniHub/src/omniconnect/connectors/)

---

## Design Check & Status (Phase 1 / Track O)

- **Onboarder Functionality**: The onboarder builds an `IntegrationDef`-compatible custom payload based on classification questions (Auth: API Key | OAuth | Username+Password | None; Direction: I call it | It calls me | Both; Intent: Monitor | Trigger | Events | All).
- **Persistence**: Integrations are persisted via `createOmniLinkIntegration(userId, name, type)` (which wraps the Supabase `integrations` table insert) and custom integrations generate API keys via `ConnectorKit` through the Edge Function.
- **Conflict Assessment**: Since PR #1641 is OPEN and contains the implementation of the onboarder (`src/components/omnibridge/IntegrationOnboarder.tsx`), the OmniBoard hub page (`apps/omnihub-site/src/pages/OmniBoard.tsx`), and the registry changes (`src/omniconnect/core/registry.ts`), these files are strictly **LOCKED**.
- **Result**: Track O is already implemented inside the active PR #1641. Editing these files would cause direct merge conflicts and duplicate PR #1641. Therefore, Track O is fully blocked from changes under the non-duplication rule.
