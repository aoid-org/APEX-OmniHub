---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v8.2 | LAST_UPDATED=2026-06-10 -->
# Skill Forge Implementation

## Overview
**Skill Forge** is a user-facing AI skill creation workflow that enables users to generate custom business automation skills through a 3-step wizard interface. The feature enforces a strict 3-skill limit for free-tier users (the "Pilot Trap") to drive paid conversions.

This document is cross-referenced against the actual code as of 2026-06-10. Where earlier revisions drifted (mocked generation, timestamp-style skill names, a `/skill-forge` route), the statements below reflect the verified current state.

## Architecture

### Database Layer
**Migration**: `supabase/migrations/20260214000001_skill_forge_protocol.sql`

#### Table: `user_generated_skills`
Stores individual forged skills with the following columns:
- `id` (UUID, PK) - Unique skill identifier
- `user_id` (UUID, FK → auth.users) - Owner reference
- `name` (TEXT) - Generated skill name: `skill_${crypto.randomUUID()}` — a full UUID, **not** a timestamp (e.g. `skill_9f4a2c1e-7b3d-4e8a-a1c5-2d6f8b0e4a9c`)
- `trigger_intent` (TEXT) - User-defined activation condition
- `definition` (JSONB) - Skill structure: `{name, description, instructions[], required_apis[]}`
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `is_active` (BOOLEAN) - Active status flag (table default; not set by the insert call)
- `origin` (TEXT) - Source: `skill_forge`, `api`, `import` (table default; not set by the insert call)

The edge function insert writes exactly four fields: `{ user_id, name, trigger_intent, definition }`.

**Row-Level Security (RLS)**:
- Users can SELECT, INSERT, UPDATE, DELETE only their own skills
- Enforced via `auth.uid() = user_id` policies

#### Function: `check_skill_entitlement(user_uuid UUID)`
plpgsql, `SECURITY DEFINER`, `search_path = public`. Counts active skills via `SELECT COUNT(*) ... WHERE user_id = user_uuid AND is_active = true` and returns:
```json
{
  "allowed": boolean,
  "current": number,
  "max": number,
  "tier": "BASIC" | "PRO"
}
```

**Business Logic**:
- Free tier (BASIC): 3 skills maximum (The Pilot Trap)
- PRO tier: 999,999 skills (effectively unlimited)
- Defaults to BASIC tier if no `user_entitlements` record exists

### Edge Function
**Path**: `supabase/functions/generate-business-skills/index.ts`

**Dual Mode Operation**:
1. **SkillForge Flow**: Triggered when `intent` field is present in request body (authenticated)
2. **OnboardingWizard Flow** (Legacy): Triggered when `description` and `goal` fields are present (public, rate-limited)

**SkillForge Request Flow**:
1. **Authentication Check**: Validates JWT token via `supabase.auth.getUser()` on a client initialized with the `Authorization` header; rejects missing/invalid tokens (401)
2. **Entitlement Gate**: Calls `check_skill_entitlement()` RPC
   - Returns **402 Payment Required** if limit reached
3. **Input Validation**: Requires `intent`, `trigger`, `constraints` (400 if missing)
4. **Skill Generation (live LLM)**: Calls the Anthropic API
   (`https://api.anthropic.com/v1/messages`) with model
   `claude-3-5-haiku-20241022`, `max_tokens: 1024`. The LLM produces a
   `SkillDefinition` JSON; the function then overwrites the generated name
   with `skill_${crypto.randomUUID()}` to guarantee uniqueness. Generation
   failures return 422. (Generation is no longer mocked.)
5. **Database Insert**: Persists `{ user_id, name, trigger_intent, definition }` to `user_generated_skills`
6. **Success Response**: Returns the skill definition plus entitlement stats.
   Note `used` is `entitlement.current + 1` — an optimistic increment, not a
   post-insert database read:
```json
{
  "success": true,
  "skill": { "name": "skill_<uuid>", "...": "..." },
  "entitlement": { "used": 1, "max": 3, "tier": "BASIC" }
}
```

**Monetization Enforcement** (two layers):

1. **Edge-function gate (optimistic)**: `check_skill_entitlement()` RPC is called before generation; returns 402 if `allowed` is false.
2. **DB-level trigger (atomic)**: `trg_enforce_skill_entitlement` (`BEFORE INSERT OR UPDATE OF is_active`) serialises concurrent writes per user via `pg_advisory_xact_lock` and re-validates the cap in the same transaction as the insert. When the trigger fires it raises `LIMIT_REACHED: skill cap (N) reached for tier T`; the edge function maps this `insertError` to the same 402 body as the gate above — closing the check-then-insert TOCTOU race.

```typescript
if (!entitlement.allowed) {
  return new Response(JSON.stringify({
    error: 'LIMIT_REACHED',
    message: 'SYSTEM OVERLOAD — Upgrade to Architect Tier to forge more skills.',
    context: { current, max, tier }
  }), { status: 402 }); // Payment Required
}
```

### Frontend Surfaces (three)

SkillForge has three distinct UI surfaces. They share the same edge function
but differ in success behavior.

#### 1. Full-page wizard — `apps/omnihub-site/src/pages/Launch/SkillForge.tsx`
- **Route**: `/launch/skillforge` — protected (requires authenticated session); registered in `App.tsx`
- 3-step wizard (Intent → Trigger → Constraints) with Framer Motion transitions and a progress bar
- **Voice input**: Web Speech Recognition toggle (Mic/MicOff icons, amber/orange styling). Transcript appends to current field with space separator. Stops on step change, unmount, or submit. `toast.error('VOICE UNAVAILABLE', ...)` if API unavailable.
- Zod validation at submission: `intent`/`trigger` 8–300 chars, `constraints` 8–500 chars
- On 402: Sonner toast `toast.error('SYSTEM OVERLOAD', { description: 'Upgrade to Architect Tier to forge more skills.' })`
- On success: `setStep(4)` — the Step 4 "Skill Operational" success state with reset button **exists only in this full-page variant**

#### 2. Embeddable modal widget — `src/components/skills/SkillForgeWidget.tsx`
- Dialog-based 3-step wizard other surfaces can embed
- Same Zod schema; the Next/Forge button is disabled by `isStepEmpty` (a pure
  emptiness check on the current field) — Zod runs inside `mutationFn` at
  submission time
- Voice input via the Web Speech Recognition API (Chrome/Edge); transcripts
  append to the current field
- On 402: throws `'SYSTEM OVERLOAD — Upgrade to Architect Tier to forge more skills.'`, surfaced in a destructive toast titled `FORGE FAILED`
- On success: toast `SKILL FORGED` with `${skill.name} is operational (used/max)`, then invalidates React Query keys `['user-skills']` and `['workflows']`, then `resetForm()` + `setOpen(false)` — **the dialog closes; there is no Step 4 in the widget**

#### 3. OmniSkills module — `apps/omnihub-site/dashboard/components/modules/OmniSkillsModule.tsx`
- Registered as `omniskills: lazy(() => import('./modules/OmniSkillsModule'))`
  in the `MODULE_COMPONENTS` map in
  `apps/omnihub-site/dashboard/components/ModuleRenderer.tsx`. Component
  routing lives in `ModuleRenderer.tsx`; `ModuleRegistry.ts` manages module
  data (stats, items, actions) only.
- Per the OmniDash sidebar contract, **OmniSkills is not a left-sidebar
  widget** — it remains available through the header utility/module access
  path.
- Shows the entitlement bar ("Free Skills Used: N/3") derived from
  `useOmniModuleState('omniskills')` live stats — never hardcoded. The amber
  paywall indicator activates when `used >= total`.
- The "Forge New Skill" button fires `onClose()` then `navigate('/launch/skillforge')`.

## End-to-End Flow

### User Creates 1st Skill (Free Tier)
1. User opens the OmniSkills module and clicks "Forge New Skill" → `/launch/skillforge` (or uses an embedded `SkillForgeWidget`)
2. Fills Step 1: Intent = "Auto-save invoices to Xero"
3. Fills Step 2: Trigger = "Stripe payment webhook"
4. Fills Step 3: Constraints = "Only invoices over $100"
5. Clicks "Forge Skill"
6. Edge function checks entitlement: `{allowed: true, current: 0, max: 3, tier: 'BASIC'}`
7. Anthropic generates the definition; skill is persisted as `skill_<uuid>`
8. Success toast: "SKILL FORGED" (widget also reports `(1/3)` from the optimistic increment)
9. Full page advances to Step 4; the widget closes and React Query refreshes the skill palette and workflows

### User Attempts 4th Skill (Free Tier - Pilot Trap Activated)
1. User has 3 active skills
2. Fills all 3 wizard steps
3. Clicks "Forge Skill"
4. Edge function checks entitlement: `{allowed: false, current: 3, max: 3, tier: 'BASIC'}`
5. Edge function returns **402 Payment Required**
6. Error toast: "SYSTEM OVERLOAD — Upgrade to Architect Tier to forge more skills."
7. User remains on Step 3 (wizard does not advance)

## Testing Checklist

### Database Migration
- [x] Migration runs idempotently (`CREATE TABLE IF NOT EXISTS`)
- [x] RLS blocks unauthorized access (verify with different user_id)
- [x] `check_skill_entitlement()` defaults to `max_limit=3` when no `user_entitlements` record exists
- [ ] Test with existing `user_entitlements` record (BASIC tier)
- [ ] Test with PRO tier (should allow unlimited)

### Edge Function
- [x] Returns 401 for missing/invalid auth token
- [x] Returns 400 for missing fields (intent/trigger/constraints)
- [x] Returns 402 when limit reached (4th skill attempt)
- [x] Returns 422 when Anthropic generation fails
- [x] Returns 200 with skill definition on success
- [x] Inserts record into `user_generated_skills` table
- [x] Legacy support: OnboardingWizard flow still works

### React Components
- [x] Wizard advances sequentially (Step 1 → 2 → 3)
- [x] Data persists across steps
- [x] Next button disabled when textarea empty
- [x] 402 errors display upgrade prompt via toast
- [x] Full page shows Step 4 "Skill Operational" confirmation; widget closes on success
- [x] Widget invalidates `['user-skills']` and `['workflows']` query keys on success
- [x] Reset button (full page) returns to Step 1 with cleared form data

## Security Considerations

### RLS Enforcement
All `user_generated_skills` queries are protected by RLS policies. Even if edge function logic is bypassed, users cannot:
- View other users' skills
- Insert skills with different `user_id`
- Update/delete skills they don't own

### Monetization Throttle
The 3-skill limit is enforced at **database level** via the `check_skill_entitlement()` function, not just in the UI. This prevents:
- Direct API manipulation
- Client-side bypasses
- Race conditions (atomic count in stored function)

### SQL Injection Prevention
All database operations use parameterized queries via Supabase client. No raw SQL concatenation.

## Deployment

### Prerequisites
1. Supabase project with auth enabled
2. Environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (required for live skill generation)
   - `ALLOWED_ORIGINS` (CORS configuration)

### Deployment Steps
1. Apply migration: `supabase db push`
2. Deploy edge function: `supabase functions deploy generate-business-skills`
3. Build frontend: `npm run build`
4. Verify:
   - Create 3 skills successfully
   - 4th skill attempt returns 402 error
   - Toast notifications display correctly

## Relationship to OmniBoard

SkillForge-forged skills that target payload normalization (e.g.
`apex-universal-sync-orchestrator`) serve OmniBoard's **application
integration layer**. OmniBoard itself is the user-facing UI endpoint for app
integration (Left Sidebar Widget → OmniBoard modal).
Skill descriptions scope to the integration pipeline and state that they do
not handle client interactions; they must not claim OmniBoard as a whole is
integration-only. See `docs/platform/OMNIBOARD.md`.

## Completed Since Initial Release
- [x] LLM integration for skill generation (Anthropic `claude-3-5-haiku-20241022`; previously mocked)
- [x] Embeddable `SkillForgeWidget` with voice input and React Query cache invalidation
- [x] OmniSkills module with live entitlement bar and paywall indicator

## Future Enhancements
- [ ] Skill editing (UPDATE operation)
- [ ] Skill deactivation (soft delete via `is_active = false`)
- [ ] PRO tier upgrade flow
- [ ] Skill analytics (usage tracking, success rate)
- [ ] Skill marketplace (share skills across users)

## References
- `docs/platform/OMNIBOARD.md` — OmniBoard integration surface definition
- `.claude/skills/apex-universal-sync-orchestrator/` — reference integration-layer skill forged through this workflow (rubric 100/100)
- `supabase/migrations/20260214000001_skill_forge_protocol.sql` — database layer
