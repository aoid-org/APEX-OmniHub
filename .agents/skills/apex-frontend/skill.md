---
name: apex-frontend
description: "Architect Cathedral-tier, UX-centered front-end components. Triggers: build UI, create frontend, style landing page, implement UI component"
version: "2.1.0"
archetype: "workflow"
platform: "google-antigravity"
license: "Proprietary - APEX Business Systems Ltd."
---

# APEX Frontend Architecture

**Input**: UX flow requirements, reference imagery, APEX brand guidelines (colors, typography, spatial tokens).
**Output**: Production-ready DOM structures, integrated physics-based animations, Vercel-ready commits.
**Success**: Zero-friction user flow, reduced cognitive load, exact APEX brand matching, zero-vibe structural elegance.
**Fails When**: Using generic AI-vibe styling, infinite visual QA loops on animated components, violating atomic idempotency, or ignoring spatial hierarchy.

---

## 🏛️ APEX PROPRIETARY LICENSE

**Copyright © 2026 APEX Business Systems Ltd. All Rights Reserved.**
This software is proprietary and confidential. Internal use only. Public distribution, unauthorized modification, or redistribution is strictly prohibited. 

---

## Decision Tree

**What architectural component is being forged?**
├─ Full Viewport / User Journey → Use "Macro-Orchestration & Flow"
├─ Micro-Interaction (Button, Input, Card) → Use "Atomic UX Insertion"
└─ Dynamic/3D Canvas Element → Use "Spatial & Shader Protocol"

---

## Macro-Orchestration & Flow

**Failures to avoid**:
- ❌ Hallucinating hex codes or font weights → Fractures brand uniformity.
- ❌ Cluttered UI mapping → Increases cognitive load. Whitespace is a structural tool, not empty space.
- ❌ Running automated screenshot loops on dynamic video backgrounds → Infinite execution loop.

**Correct approach**:
1. Ingest `brand_assets` directory (extracting exact hex, typography, and easing curves).
2. Wireframe DOM for maximum accessibility and minimal user friction.
3. Apply APEX CSS spatial variables (padding, margins, gaps).
4. Execute single-pass Puppeteer screenshot for visual QA.
5. Await executive approval before GitHub commit.

---

## Atomic UX Insertion

**Failures to avoid**:
- ❌ Hardcoding CSS values instead of utilizing global state design tokens.
- ❌ Static states → Every interactive element MUST possess hover, focus, and active physics.

**Correct approach**:
```javascript
// Always utilize global APEX design tokens and physics-based easing
const apexButton = document.createElement('button');
apexButton.className = 'apex-btn-primary interaction-ready';

// Enforce Apple-level micro-interactions via CSS classes linked to global variables
apexButton.style.backgroundColor = 'var(--apex-primary-brand)';
apexButton.style.transition = 'all var(--apex-ease-out-expo) 0.3s';
apexButton.style.borderRadius = 'var(--apex-radius-md)';
apexButton.setAttribute('aria-label', 'Execute critical action');