## 2024-05-19 - [Added memo to OmniBridgeLiveFeed]
**Learning:** Found that OmniBridgeLiveFeed component was not memoized, but manages high-frequency real-time events. Added React.memo() to prevent unnecessary re-renders.
**Action:** Use React.memo() to wrap components that receive real-time data but whose props change infrequently.
