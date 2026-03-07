# Accessibility (A11y) Playbook

Objective: critical flows are usable with screen readers, keyboard (where relevant), and with large text / reduced motion.

## Core requirements (non-negotiable)
- Semantic roles: buttons are buttons; headings are headings.
- Labels: every interactive control has an accessible name.
- Focus order: logical, predictable.
- Contrast: text and essential UI meet contrast needs.
- Target size: touch targets meet platform standard.
- Motion: respect reduced-motion; avoid essential info via animation only.

## Audit procedure (fast)
1) Keyboard-only pass (web/desktop):
   - Tab through: can reach everything? focus visible? trapped in modals?
2) Screen reader pass:
   - iOS VoiceOver / Android TalkBack / NVDA/VoiceOver on web
   - Can you identify controls? do labels read correctly? is state announced?
3) Text scaling:
   - Largest text size; check truncation, overlap, and hidden CTAs.
4) Contrast scan:
   - Check text on backgrounds, disabled states, error text.
5) Forms:
   - Labels persist, errors associated with fields, instructions announced.

## Fix patterns
- Replace placeholder-only labels with explicit labels.
- Ensure errors are tied to input (aria-describedby / platform equivalent).
- Provide “Skip to content” on web if needed.
- Use live regions/toasts that are announced (careful with spam).

## A11y acceptance criteria template
- [ ] All interactive elements have accessible labels
- [ ] Focus order matches visual order
- [ ] Modal traps focus and returns focus on close
- [ ] Errors announced and associated with fields
- [ ] Reduced-motion mode supported
- [ ] Minimum target size met

## Common a11y bugs and root causes
- Unlabeled icon buttons → missing accessible name
- Focus disappears → no visible focus styles / wrong focus management
- Screen reader reads nonsense → nested interactive elements / wrong roles
- Dynamic content not announced → missing live region announcements
