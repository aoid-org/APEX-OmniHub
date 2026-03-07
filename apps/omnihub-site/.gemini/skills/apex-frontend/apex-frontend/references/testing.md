# Testing & Verification

## 5-task usability script (fast)
1) First-time happy path
2) Recover from an error
3) Find a secondary feature/settings
4) Interruption + resume
5) Offline or poor network behavior

Pass: ≥4/5 tasks completed without moderator rescue.

## Frontend test pyramid
- Unit: reducers/view-models/formatters
- Integration: component behavior with mocked services
- E2E/UI: critical flow(s)

## Visual regression
- Snapshot key screens/components
- Include dark/light mode if applicable

## Accessibility verification
- Screen reader pass on critical flow
- Keyboard pass (web/desktop)
- Contrast checks
- Large text pass

## Performance regression checks
- Lighthouse/Web vitals (web)
- Startup + scroll traces (mobile)
- Memory spikes on image-heavy screens
