# APEX-OmniHub: Omnimodal Architecture & Spatial Computing Research V2

## 1. Executive Summary: The Proprietary IP Moat

The evolution of the APEX OmniHub modal system requires moving beyond standard component wrappers to a proprietary **Spatial Computing Architecture**. Instead of relying on off-the-shelf micro-frontend frameworks (like Module Federation/single-spa) or heavy third-party routers, APEX will establish a "zero-trust" rendering moat. This operates on three distinct IP pillars:

1. **The Omni-Intent Decision Engine:** A proprietary, Zod-validated state router that anticipates context rather than blindly following explicit route paths.
2. **Zero-Trust Shadow-DOM Sandboxing:** A native Web Component orchestrator (`<omni-app-shell>`) that enforces strict CSS/DOM isolation for third-party integrations, functioning as an airtight client-side sandbox.
3. **Kinematic FLIP Compositor:** Leveraging the existing `OmniMediaModal` spatial patterns with Framer Motion to create Apple-grade, GPU-accelerated window management (PiP, spatial morphing) without external spatial computing libraries.

---

## 2. Current APEX OmniHub Modal Architecture (Inventory)

### 2.1 The Existing Bifurcation

Currently, APEX OmniHub relies on a highly modular but bifurcated modal state:

- **`UniversalModalEngine`:** The schema-driven workhorse for deterministic interactions (OAuth, Forms, Selection, Confirmation). Uses a central `useOmniModal` Zustand store and Radix `dialog`. It correctly enforces idempotency, regression-free Zod validation at the boundary, and kinematic exits (non-unmounting).
- **`OmniMediaModal`:** The Spatial Engine V3 implementation. Handles `media`, `editor`, and `terminal` payloads. Implements Picture-in-Picture (PiP), drag handling, event shielding, and FLIP (`layout` prop) morphing animations via Framer Motion.

### 2.2 Gap Analysis & Constraints

- **Lack of Unification:** The system is split. `UniversalModalEngine` handles static forms, while `OmniMediaModal` handles spatial/windowed apps. The true "Omnimodal" must transparently unify these behaviors under a single Polymorphic orchestrator.
- **Framework Lock-in Risk:** Both engines are heavily tied to React/Radix. To securely host Vue, Svelte, or vanilla JS integrations from partners without style bleed, we lack a framework-agnostic boundary.
- **Static Stacking:** `ZIndexManager` concepts exist, but the current UI relies on hardcoded indices (e.g., `zIndex: 9999` in `OmniMediaModal`). A unified root portal stacking context is needed to prevent integration z-index wars.

---

## 3. The Polymorphic Omnimodal Component (Design)

### 3.1 Framework-Agnostic React Wrapper

Implement the unified `OmniModal` using an advanced polymorphic pattern that combines React's `as` prop with Radix's `asChild` composition, but injects our proprietary isolation layer.

```tsx
interface OmniModalProps<E extends React.ElementType> {
  as?: E;
  open: boolean;
  onClose(): void;
  intentContext?: Record<string, unknown>;
  children?: React.ReactNode;
}

const OmniModal = <E extends React.ElementType = "div">({
  as: Component = "div",
  open,
  onClose,
  children,
  ...rest
}: OmniModalProps<E>) => {
  // Uses Radix for ARIA/focus traps, but overrides DOM positioning
  // via a strictly controlled React Portal bound to the APEX root stacking context.
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <Component {...rest} className="omni-spatial-host">
        {children}
      </Component>
    </Dialog>
  );
};
```

### 3.2 The Stacking Context Moat

Do not allow the modal to mount sequentially in the DOM tree. It must be portaled to an `isolate` body container.

```css
/* index.css - The APEX Semantic Stacking Layer */
#omni-portal-root {
  isolation: isolate;
  --z-index-backdrop: 400;
  --z-index-omniboard: 500; /* Onboarding layer */
  --z-index-omnimodal: 600; /* The execution layer */
  --z-index-toast: 700;
}
```

---

## 4. Proprietary Intent-Driven Decision Engine

### 4.1 Moving Beyond URL Routes

Traditional MVPs map URL routes to modals (`/settings/oauth`). The IP moat approach uses **Intent-Driven Routing**. We build a rules engine that intercepts `invoke()` commands.

**The Intent Schema (Zod Validated):**

```json
{
  "schemaVersion": 2,
  "intentAction": "authorize_payment",
  "priority": "critical",
  "context": { "device": "mobile", "urgency": "high" },
  "payload": { ... }
}
```

### 4.2 The Decision Matrix

Upon receiving an intent, the APEX engine runs it through a deterministic matrix:

1.  **Priority = Critical?** Block all background processes (pause `Omniboard` tutorial XState machines) and render an opaque modal.
2.  **AppType = Tool/Terminal?** Route to the Spatial Engine (PiP capable, draggable).
3.  **Context = Passive?** Ignore modal entirely and downgrade to a persistent Toast notification.

This intelligent downgrading/upgrading of the UI based on intent context is a significant architectural advantage over standard switch-case modal engines.

---

## 5. Zero-Trust Micro-Frontend Isolation (The Sandbox)

Rather than adding dependencies like Webpack Module Federation, we build a native Web Component wrapper to host 3rd-party integrations. This guarantees security (CSS/DOM isolation) using native browser specs.

### 5.1 The `<omni-app-shell>` Custom Element

When an integration intent fires, the Omnimodal dynamically mounts this element:

```typescript
class OmniAppShell extends HTMLElement {
  connectedCallback() {
    // 1. Create a closed/open Shadow Root to prevent CSS bleed
    const shadow = this.attachShadow({ mode: "open" });

    // 2. Parse integration config
    const config = JSON.parse(this.getAttribute("data-config") || "{}");

    // 3. Inject CSS Resets specifically for the shadow space
    const reset = document.createElement("style");
    reset.textContent = `:host { display: block; all: initial; } /* APEX Sandbox Reset */`;
    shadow.appendChild(reset);

    // 4. Boot the external application (Vue, React, Vanilla) inside the Shadow DOM
    if (config.entryUrl) {
      this.loadIntegration(config.entryUrl, shadow);
    }
  }

  disconnectedCallback() {
    // Deterministic memory cleanup
    this.dispatchEvent(new CustomEvent("omni:integration:teardown"));
  }
}
customElements.define("omni-app-shell", OmniAppShell);
```

**Why this is an IP Moat:** It completely decouples the APEX host from the client apps. If a poorly written third-party app sets `body { display: none }` or `position: fixed; z-index: 99999`, it is completely neutralized by the Shadow DOM boundary and cannot escape the Omnimodal.

---

## 6. Kinematic Spatial Animation (Performance Moat)

Relying on existing architecture from `OmniMediaModal`, we standardize the **FLIP (First, Last, Invert, Play)** compositing using Framer Motion's `layout` properties.

- **Zero DOM Destruction:** When transitioning from a full-screen form down to a Picture-in-Picture (PiP) background task, the modal does _not_ unmount and remount.
- **Apple-Grade Physics:** We standardize `const fluidSpring = { type: "spring", mass: 0.5, damping: 25, stiffness: 300 }`.
- **GPU Hinting:** Applying `will-change: transform` and ensuring all modal transitions operate purely on `transform: translate3d(...)` and `opacity`. The browser compositor never recalculates layout during animation, guaranteeing 60fps on low-end devices.

---

## 7. Execution & Migration Plan

1.  **Phase 1: State Machine Refactor**
    - Merge the concerns of `UniversalModalEngine` and `OmniMediaModal` into a single `OmniSpatialHost.tsx`.
    - Implement the Intent Decision Engine in `omniModalStore.ts` to replace direct `type: 'media'` mapping with `intentAction` parsing.
2.  **Phase 2: The Stacking Portal**
    - Create a dedicated `<div id="omni-portal-root">` outside the main React tree.
    - Map CSS variables for the semantic sequence (`--z-index-backdrop`, etc).
3.  **Phase 3: Zero-Trust Sandbox Implementation**
    - Implement and register the `omni-app-shell` Web Component.
    - Route all `microfrontend` or `3rd_party` intent payloads into this Shadow DOM shell.
4.  **Phase 4: Strict Verification**
    - E2E Pipeline tests must verify that an injected script inside `omni-app-shell` cannot access `window.document.querySelector('#root')`.
    - Stress tests for memory leaks when opening/closing 50+ polymorphic instances.
