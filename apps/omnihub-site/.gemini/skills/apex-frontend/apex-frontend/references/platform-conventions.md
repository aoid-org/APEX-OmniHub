# Platform Conventions (iOS / Android / Web / Desktop)

Use this to avoid cross-platform friction.

## iOS conventions
- Navigation: top bar title; back on left; swipe-back works when possible.
- Sheets: bottom sheets or modals with clear close.
- Lists: grouped styles, separators, large titles if appropriate.
- Text scaling: support Dynamic Type; avoid truncation.
- Safe areas: respect notch/home indicator.

## Android conventions
- Navigation: top app bar; back is system; avoid hijacking back.
- Material patterns: consistent elevation, ripple feedback.
- Bottom nav: 3–5 destinations.
- Permissions: request in context; explain rationale.

## Web conventions
- Keyboard + mouse first-class:
  - Tab order logical, visible focus
  - Escape closes modals
  - Enter submits forms (carefully)
- Responsive design:
  - breakpoints + fluid type
  - avoid hover-only interactions
- Performance:
  - code splitting, lazy loading
  - avoid layout shifts

## Desktop conventions (Electron / native)
- Resizable windows; persistent sidebars; shortcuts.
- Menus and context menus can be expected.

## Cross-platform rule
**Same intent, native expression**:
- Keep IA and terminology consistent.
- Adapt controls/navigation to platform expectations.

## Quick checks
- [ ] Back/escape behavior consistent
- [ ] Safe area / keyboard avoidance handled
- [ ] Text scaling doesn’t break layout
- [ ] RTL/localization tested (if relevant)
