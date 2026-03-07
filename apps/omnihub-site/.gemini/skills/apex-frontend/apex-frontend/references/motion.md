# Motion & Micro-interactions

Goal: motion that **communicates state**, **delights**, and **never blocks**.

## Motion principles
- Meaningful: motion explains cause/effect (tap → response).
- Fast: micro-interactions 80–180ms; transitions 180–280ms.
- Consistent: reuse durations/easings.
- Respect reduced motion: offer simpler alternatives.

## High-ROI motion patterns
- Press feedback: scale/opacity + ripple (platform-appropriate)
- Staggered entrance: subtle, avoids “casino UI”
- Skeleton shimmer (subtle) or static skeletons
- Toast/snackbar slide + dismiss
- Expand/collapse with height + opacity (avoid jank)

## Anti-patterns
- Long loading animations masking slow work
- Motion that causes layout shifts
- Parallax/heavy effects that drop frames

## Motion spec snippet (template)
- Trigger:
- Duration:
- Easing intent:
- Properties animated:
- Reduced-motion behavior:
