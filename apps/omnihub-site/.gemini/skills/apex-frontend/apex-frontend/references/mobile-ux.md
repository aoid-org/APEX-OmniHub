# Mobile UX Field Manual (apex-frontend)

Use this when designing or reviewing **mobile-first** experiences.

## The 10 Mobile Laws (actionable)
1) **Thumb-first actions**: primary CTA in reachable zone; avoid top-right-only critical actions on large devices.
2) **One screen, one job**: each screen has a primary action; everything else supports it.
3) **Progress always visible**: show where the user is in multi-step flows (stepper, summary header, or breadcrumb-like copy).
4) **Latency is a UX bug**: show immediate feedback within 100ms (pressed state) and a progress indicator within ~1s.
5) **Interruptions happen**: background/resume, phone call, permission prompts, flaky network—always recover.
6) **Gestures are optional**: never hide core navigation behind an undiscoverable gesture; provide visible affordances.
7) **Prevent double-submit**: disable CTA on submit; show pending; support retry + idempotency hints.
8) **Respect platform expectations**: back behavior, navigation patterns, safe areas, text scaling, and system UI.
9) **Content first**: skeletons > spinners when layout is stable; keep content jump minimal.
10) **Error messages are instructions**: say what happened, why, how to fix, and preserve user input.

## State completeness (required)
For each screen/critical component, explicitly design:
- Loading (initial + refresh)
- Empty (no results, no data yet)
- Error (network, validation, server, unknown)
- Partial (some data, some missing)
- Success
- Offline / poor network
- Permission denied / restricted
- Rate limited / session expired

### State table template
| State | User sees | User can do | System does | Recovery |
|---|---|---|---|---|
| Loading | Skeleton + header | Cancel/back | Fetch | Auto |
| Error (network) | Inline message | Retry | Re-fetch | Manual |
| Offline | Banner | Continue cached | Queue actions | Auto/manual |

## Navigation patterns (choose intentionally)
- **Tab bar**: 3–5 top-level destinations; stable identity.
- **Stack navigation**: drill-down; back returns to previous context.
- **Modal**: short, focused tasks; clear close; avoid deep modals.
- **Bottom sheet**: transient choices; keep primary CTA visible.

### Navigation quality checks
- “Where am I?” obvious via title + selected nav.
- “How do I go back?” always available and consistent.
- “How do I get out?” escape hatch from deep flows.
- Back should not lose user work; preserve drafts.

## Forms & input (mobile pain points)
- Label above input (not placeholder-only).
- Inline validation after blur; summary on submit.
- Use correct keyboard type (email, number).
- Avoid long forms: chunk into steps.
- Provide autofill; allow paste; show/hide password.
- For destructive actions: require confirmation (but don’t overdo friction).

## Touch targets & spacing
- Minimum comfortable tap target: ~44×44 (or platform standard).
- 8px is too tight for adjacent primary controls; use spacing.
- Make the entire row tappable in lists; not just tiny icons.

## Content layout
- Use progressive disclosure (accordion, “Show more”, steps).
- Keep key content above the fold; support scroll.
- Avoid “dead ends”: empty states must propose the next action.

## Micro-interactions (high ROI)
- Press feedback (visual + haptic if available)
- Loading skeletons, not blocking spinners
- Success feedback (toast/snackbar + optional undo)
- Inline errors
- Pull-to-refresh where expected
- Smooth keyboard avoidance and focus transitions

## Quick mobile review checklist
- [ ] Primary action reachable by thumb
- [ ] Safe areas handled (notches, home indicator)
- [ ] Keyboard doesn’t cover inputs/CTA
- [ ] Back behavior correct everywhere
- [ ] All states designed and testable
- [ ] Copy is short, action-oriented
- [ ] Offline/slow network behavior defined
