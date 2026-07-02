---
title: OmniDash Web Vitals Remediation — CLS/INP
date: 2026-07-01
status: active
source: Cloudflare Web Analytics screenshots supplied by owner
surface: apps/omnihub-site/dashboard
---

# Findings

Cloudflare Web Analytics screenshots showed `/omnidash` contributing to CLS and INP regressions:

- CLS debug selectors included `div.border.border-white/10.max-h-[calc(100dvh-2rem)]...` and `#root > div > main > section...`.
- INP debug selector was `html>body` with ~312ms latency.

# Root-cause remediation applied

1. Root/app shell now reserves a full viewport before React route/auth resolution.
   - File: `apps/omnihub-site/src/styles/globals.css`
   - Purpose: prevent root/app-shell height jumps between auth loading, redirects, and OmniDash mount.

2. OmniDash dashboard CSS no longer imports Google Fonts with default swap behavior.
   - File: `apps/omnihub-site/src/styles/omnidash-layout.css`
   - File: `apps/omnihub-site/index.html`
   - Purpose: avoid late CSS `@import` font swaps; both Space Grotesk and JetBrains Mono are loaded from the document head with `display=optional`.

3. DraggableWidget desktop pointer behavior now starts in the same gesture after movement threshold, with pointer capture and requestAnimationFrame-batched transforms.
   - File: `apps/omnihub-site/dashboard/DraggableWidget.tsx`
   - Purpose: reduce body-level interaction latency and align with Drag/Drop Law. Touch keeps long-press protection.

4. OmniSpatialHost dialog panel is layout/paint-contained and only promotes transform while dragging.
   - File: `apps/omnihub-site/dashboard/components/OmniSpatialHost.tsx`
   - Purpose: isolate modal open/drag work from rest-of-page layout and reduce dialog-attributed CLS blast radius.

# Validation expectation

Run focused typecheck/build and targeted OmniDash modal/drag tests. Live Cloudflare Web Analytics percentages will lag until production deploy receives new field samples.
