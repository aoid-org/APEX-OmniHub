# Component Quality Bar

## Every component must define
- Purpose + usage
- Props
- States: default/hover(or pressed)/focused/disabled/loading/error (as relevant)
- Accessibility: role, label, focus behavior
- Motion: durations + easing intent (keep subtle unless brand calls for bold)
- Responsiveness: how it scales
- Theming: token usage, no hard-coded magic numbers when avoidable

## Example component spec (template)
See `assets/templates/component-spec.md`.

## Review checklist (PR gate)
- [ ] No hard-coded colors when token exists
- [ ] No layout shifts on state changes
- [ ] Loading state doesn’t jump
- [ ] Hit targets meet minimum
- [ ] Screen reader label present
- [ ] Unit test for state logic where meaningful
