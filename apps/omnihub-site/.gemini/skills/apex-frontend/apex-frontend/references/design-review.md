# Design Review & Critique (ship-quality filter)

Ask these questions before finalizing.

## UX
- Can a new user complete the primary task without instruction?
- Are there dead ends? Does every empty/error state have a next step?
- Is the mental model consistent across screens?

## UI
- Is hierarchy obvious in 3 seconds?
- Are spacing rhythms consistent?
- Is there a distinctive signature (type/shape/motion), not just generic components?

## Accessibility
- Can a screen reader user complete the flow?
- Does large text break anything?
- Is focus order correct?

## Performance
- Are lists virtualized? images sized? heavy effects minimized?
- Does anything do work on every render/frame unnecessarily?

## Engineering
- Are state and effects isolated from views?
- Are edge cases explicit?
- Is there a regression test for critical behavior?
