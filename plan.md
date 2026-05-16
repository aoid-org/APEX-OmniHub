1. *Analyze `src/components/omnibridge/OmniBridgeLiveFeed.tsx`*
   - Review how `events` are mapped to `<tr>` elements on every real-time update.
2. *Extract and memoize the row component*
   - Create `OmniBridgeEventRowItem` wrapped in `React.memo` to prevent re-rendering the entire 100-item table every time a new event arrives.
3. *Complete pre commit steps*
   - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
4. *Submit the change.*
   - Submit PR with the performance optimization.
