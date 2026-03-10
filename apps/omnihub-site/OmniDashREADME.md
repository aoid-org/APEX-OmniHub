
omnidash-layout.css
Change .omnidash-shell grid from 260px 1fr 320px → 260px 1fr
Remove .od-right styles
Add .omni-canvas styles (position relative, full viewport)
Add .widget-shell styles (position absolute, GPU compositing, title bar, resize handles)
Add .floating-window styles (z-index 1000+, shadow, border-radius)
Update responsive breakpoints: ≤960px → single column + stacked canvas
Update z-index hierarchy comment to include canvas layers
[MODIFY] 

App.tsx
Wrap the /omnidash route with <OmniDashProvider> to mount the zustand store above the layout.


New File Tree
apps/omnihub-site/src/
├── lib/
│   ├── motionPresets.ts         [NEW] Layer 6: Physics tokens
│   └── ZIndexManager.ts        [NEW] Layer 4: Z-Index engine
├── stores/
│   └── omniDashStore.ts         [NEW] Layer 7: Global spatial state
├── providers/
│   └── OmniDashProvider.tsx     [NEW] Layer 7: Context wrapper
├── components/omnidash/
│   ├── OmniCanvas.tsx           [NEW] Layer 2: Canvas host
│   ├── WidgetShell.tsx          [NEW] Layer 3: Widget exoskeleton
│   └── FloatingWindow.tsx       [NEW] Layer 5: PiP manager
├── layouts/
│   └── OmniDashLayout.tsx       [MODIFY] Layer 1: Shell isolation
├── pages/
│   └── DashboardOverview.tsx    [MODIFY] Becomes canvas widget
└── styles/
    └── omnidash-layout.css      [MODIFY] Canvas + widget shell styles

    
IP Moat Enforcement (OMNIDEV-V2 Layer Protocol)
Layer 1 (Algorithms): ZIndexManager.ts spatial layer math is proprietary — server-side candidates for future trade secret isolation
Layer 3 (Integration): Native pointer event drag system is deeply integrated with APEX's zustand store pattern — high switching cost
Layer 4 (Switching Costs): motionPresets.ts physics tokens are APEX-specific, embedded throughout all widgets
Layer 5 (Protection): omniDashStore.ts uses structured clone sanitization (following 

omniModalStore.ts
 pattern)
Verification Plan
Automated Tests
1. TypeScript typecheck:

bash
cd apps/omnihub-site && npx tsc --noEmit
2. ESLint:

bash
cd apps/omnihub-site && npx eslint src --ext .ts,.tsx
3. Vite production build:

bash
cd apps/omnihub-site && npm run build
4. Existing Playwright E2E tests (verify no regressions):

bash
cd apps/omnihub-site && npx playwright test tests/visual/layout-safety.spec.ts
5. Existing omnidash widget chaos tests (verify no regressions):

bash
npx vitest run tests/omnidash/omnidash-widgets.chaos.spec.tsx
Browser Validation
6. Visual validation using browser subagent:

Navigate to http://localhost:3000/omnidash
Verify sidebar and header render correctly (unchanged)
Verify canvas area fills center column
Verify at least one widget shell renders with drag handle
Verify widgets can overlap (z-index layering)
Screenshot proof captured
Manual Verification (User)
7. User-reported testing:

After implementation, start the dev server (npm run dev from apps/omnihub-site)
Navigate to /omnidash

