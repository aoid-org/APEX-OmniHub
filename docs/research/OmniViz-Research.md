---
title: "OmniVision Research — Client-Side Visual Context Ingestion"
version: "1.0.0"
date: "2026-03-01"
status: "APPROVED — Integrated into Architecture Blueprint v1.4.0"
license: "Proprietary — APEX Business Systems Ltd."
---

# Client-Side Visual Context Ingestion for APEX-OmniHub

## Objective, constraints, and measurable definition of done

You requested a deep, repo-grounded assessment and a proprietary, dependency-minimizing design to add **visual context ingestion (camera/photos)** into **OmniSlate/WorkSlate** and **APEX Agent**, with **compute + storage always client-side**, and **one-handed mobile UX** as a non-negotiable.

**Constraints (hard)**  
Compute and storage for visual ingestion remain on the client device (no server-side vision compute, no server-side image storage for this feature). The UX is thumb-first for mobile, low-cognitive-load, and accessible in one-handed operation. Engineering quality must follow APEX standards: atomic idempotency, overload-free execution, modularity, enterprise-grade performance, and regression-free delivery.

**Definition of done (measurable)**  
A release qualifies as “done” only when all of the following are true:

- **No-network guarantee for images:** During capture→preprocess→extract, the app performs **zero outbound network requests that include image bytes** (verified by automated tests + runtime instrumentation).
- **One-handed capture:** A user can do **open capture → take photo → confirm → send to APEX Agent** in < **7 seconds** on a mid-tier phone, using a single hand.
- **Deterministic idempotency:** Re-submitting the same captured visual payload produces the same `vision_context_id` and does not duplicate downstream context entries (dedupe enforced client-side).
- **Overload-free runtime:** Vision processing runs off the main thread (worker-backed) and never blocks UI input for > **16ms** per frame during interaction (scroll/tap stability).
- **User controls:** A user can **retake**, **crop**, **redact**, **clear local cache**, and **disable vision ingestion** from a single, obvious control surface.

## Repo forensic assessment: current state of visual ingestion

### There is no dedicated camera/photo visual ingestion path today

The repo’s **agent experiences** are currently text/voice oriented, without an image attachment flow:

- The **ApexAssistant** page is a text-based assistant UI with workflow invocation and streaming updates, and it integrates **VoiceInterface**, but it does not expose image capture or photo upload as part of the agent prompt path. fileciteturn64file11L1-L1
- The mobile **Agent** route is a deterministic **voice command router** (navigation + theme toggles), not a multimodal assistant with image ingestion. fileciteturn64file0L1-L1

At the platform layer, the **OmniPort API reference** defines ingestion around a `RawInput` union (text/voice/webhook) and does not define an image/vision payload type. fileciteturn66file0L1-L1

### Mobile shell exists, but camera is not configured as a first-class capability

The app is a hybrid/PWA-first stack with Capacitor present, but **camera capability is not wired as a plugin-level feature**:

- `capacitor.config.ts` configures PushNotifications only (no camera plugin configured). fileciteturn28file0L1-L1
- `package.json` includes `@capacitor/core`, platform packages, and push/device—**no camera package** is listed as a dependency. fileciteturn28file14L1-L1

### Strong foundation exists for client-side compute + client-side storage patterns

The repo already implements **client-side buffering and client-side compute nodes**—these patterns are directly reusable for vision:

- **Client-side storage via Cache API:** `EdgeCacheController` uses the browser Cache API + a local ledger and enforces a storage ceiling (e.g., 250MB) for cached media blobs. fileciteturn54file0L1-L1
- **Client-side compute node pattern:** `ClientComputeNode` constructs a Web Audio graph (compressor + routing) to do real-time DSP **entirely on-device**, with explicit lifecycle cleanup to prevent leaks. fileciteturn69file0L1-L1
- **Global persistent UI surface:** `GlobalMediaDock` demonstrates a persistent PiP-style dock that survives route transitions. fileciteturn50file0L1-L1
- **Schema-driven modal pattern:** `UniversalModalEngine` provides a store-driven, deterministic modal lifecycle with isolated render paths. fileciteturn61file0L1-L1
- OmniDash documentation explicitly positions “edge compute” and the OmniMedia engine as an architectural pillar, reinforcing the repo’s design direction toward client-side processing. fileciteturn69file1L1-L1

### PWA share target exists but does not accept files (images) today

The `manifest.webmanifest` defines a `share_target`, but its params currently include `title`, `text`, and `url` only—no `files` array is configured. fileciteturn67file0L1-L1  
For camera/photo ingestion, the share target is a prime “one-handed” intake path (share screenshot/photo → OmniLink → extract locally → send to agent), but it needs the manifest + handling logic upgrade.

## Technology landscape for building client-side vision without new dependencies

This section focuses on **standards and platform APIs** that enable camera/file intake, on-device processing, and local storage—aligned with the “no new dependencies” priority.

### Intake: camera/photo capture using web platform primitives

The most reliable dependency-free intake primitives are:

- **HTML Media Capture (`capture` attribute)** extends `<input type="file">` so the UA can invoke camera/mic capture directly from the file picker. The W3C spec defines `capture` with `user` and `environment` and explicitly frames it as a simple declarative subset of media capture. citeturn7search1
- MDN documents `capture="user"` and `capture="environment"` usage with `accept="image/*"` for front/back camera selection. citeturn6search1

For a more controlled in-app camera experience:

- **`MediaDevices.getUserMedia()`** provides a `MediaStream` when permission is granted; MDN documents constraints including `facingMode` and how to require rear camera via `{ exact: "environment" }`. citeturn5search2turn7search9

**Decision for APEX UX:** Start with **`<input capture>`** as the default path for speed, reliability, and one-handed flow. Add an advanced `getUserMedia` path only when you need a custom camera UI (continuous capture, live edge detection, frame-by-frame processing).

### Local processing: isolate compute off main thread and use browser-native codecs

To stay overload-free and enterprise-smooth, processing must be worker-friendly:

- **OffscreenCanvas** is designed to move rendering/processing off the main thread and is transferable to workers, reducing UI jank under heavy pixel ops. citeturn8search3
- **WebCodecs** provides low-level access to frames and image decoding via codecs already present in the browser, explicitly reducing the need to ship codec-heavy wasm bundles. citeturn8search4

### Client-side storage: Cache API as an existing APEX pattern

For “store locally, never upload,” the Cache API is a strong fit:

- MDN describes the **`Cache`** interface as persistent storage for Request/Response pairs, accessible in windows and workers, and under explicit app control for updates and deletion. citeturn8search1
- **`Cache.put()`** stores request/response pairs and overwrites prior entries for the same key, supporting deterministic idempotent writes. citeturn8search0

This aligns directly with your existing caching governor pattern in `EdgeCacheController`. fileciteturn54file0L1-L1

### Share-based intake: Web Share Target with files (best one-handed path)

MDN’s `share_target` reference shows manifest configuration where `params.files` accepts typed inputs (e.g., images), and recommends temporarily writing the shared files into Cache or IndexedDB and notifying clients via messaging. citeturn5search3  
The Web Share Target specification defines how `share_target` is processed in the manifest and establishes it as the contract OS share sheets use for installed PWAs. citeturn7search8

This is the cleanest one-handed workflow for “visual context from anywhere”:
**Screenshot/photo → Share → OmniLink opens directly in Visual Intake → local extraction → send to APEX Agent.**

### On-device ML acceleration: WebGPU / WebNN as the “no-runtime-dependency” compute substrate

For real on-device vision understanding (OCR/layout), you need accelerated tensor compute. The dominant dependency-free substrate is now:

- **WebGPU** is exposed via `navigator.gpu` / `WorkerNavigator.gpu` as the WebGPU entry point, and MDN documents adapter/device acquisition and secure-context requirements. citeturn6search0
- WGSL is defined in the W3C WGSL spec as the shading language used for WebGPU compute. citeturn6search7

WebNN exists but is not a universal mobile baseline:

- WebNN docs state that WebNN is mainly supported in Chromium-based browsers across multiple platforms and tracks feature availability by Chromium versions; iOS support is marked as absent in WebNN compatibility listings. citeturn5search0turn5search1

**Decision for APEX:** Treat **WebGPU as the primary acceleration layer** (when present) and deliver a strict fallback mode when unavailable (manual confirmation + clipboard-based intake, or CPU-only minimal extraction) while keeping the system architecturally identical.

## Proprietary architecture proposal: OmniVision as a first-class client-side perception layer

### High-level system: capture → preprocess → extract → context-pack → agent/slate attach

Below is the architecture that preserves APEX standards (idempotency, modularity, overload-free):

```
[Camera / Photos / Share Sheet]
          |
          v
  OmniVision Intake (UI)
  - <input capture> default
  - ShareTarget file handler
  - Optional getUserMedia pro mode
          |
          v
  OmniVision Worker Pipeline (Off-main-thread)
  - Decode (WebCodecs ImageDecoder when available)
  - Normalize (orientation, resize, contrast)
  - Redaction (user-confirmed blur boxes)
  - Hash (content hash → deterministic ID)
          |
          v
  OmniVision Local Store (Cache API)
  - Key: vision://{hash}
  - Encrypted blob optional (WebCrypto layer in Phase 2)
  - Strict retention policy (TTL + manual wipe)
          |
          v
  OmniVision Extractors (client-only)
  - OCR (WebGPU compute path)
  - Layout + entities (deterministic rules first)
  - Confidence + provenance metadata
          |
          v
  ContextPack (text-first, image optional but local-only)
  - extracted_text
  - key_value_pairs
  - tables (CSV-like)
  - redaction map
  - source pointers = vision://...
          |
          +-------------------------------+
          |                               |
          v                               v
  APEX Agent Attach                    OmniSlate/WorkSlate Attach
  - prompt injection-safe              - “Visual Inbox” item
  - idempotent link                    - pin, tag, route to tasks
```

### Why this builds an IP moat (without new dependencies)

The moat is not “camera access.” The moat is the **deterministic transformation layer** you own: **Vision → ContextPack → Canonical Actions**.

Concrete IP components you fully own:

- **Deterministic Vision ContextPack schema** tuned to OmniPort/OmniTrace conventions (confidence scoring, provenance, redaction map).
- **Idempotent dedupe hashing** (same visual input → same context id) and “no duplicate downstream context” guarantees, modeled after the repo’s idempotency posture in the assistant workflow architecture. fileciteturn64file11L1-L1
- **Overload governor**: strict concurrency limits (1 active job; queued jobs capped; frame dropping strategy modeled after existing client compute node philosophy). fileciteturn69file0L1-L1
- **Local retention + enterprise controls**: vision cache partitioning, TTL, and wipe-on-logout / wipe-on-policy-change.

### Exact integration points in this repo

This plan uses existing patterns and surfaces already in APEX-OmniHub:

- **Mobile entry point:** Add a central “Scan” action to `MobileBottomNav` (or a FAB layered above it) to keep the action thumb-accessible. fileciteturn68file0L1-L1
- **Global persistent surface:** Mirror `GlobalMediaDock` to implement a `GlobalVisionDock` (preview + redact + confirm) that persists across routes. fileciteturn50file0L1-L1
- **Worker-backed compute node pattern:** Use `ClientComputeNode` as the archetype for a `ClientVisionComputeNode` that owns worker lifecycle and teardown. fileciteturn69file0L1-L1
- **Local storage governor:** Clone the Cache-governor strategy from `EdgeCacheController` into a dedicated `VisionCacheController` with a tighter ceiling and strict “never proxy images” rule. fileciteturn54file0L1-L1
- **PWA share intake:** Extend `manifest.webmanifest` to accept `files` under `share_target.params` (images), following MDN’s example. fileciteturn67file0L1-L1 citeturn5search3turn7search8
- **Service worker routing:** `public/sw.js` exists and is already the PWA execution plane. fileciteturn72file0L1-L1
- **Agent attach target:** Add “Attach Visual Context” into `ApexAssistant.tsx` (the assistant page) as a first-class message composer feature. fileciteturn64file11L1-L1
- **OmniSlate/WorkSlate attach target:** OmniDash’s “OmniSlate” is currently a UI placeholder area in Today.tsx; the vision inbox can live there initially as a compact list component (until WorkSlate becomes a full module). fileciteturn64file19L1-L1

**MISSING: WorkSlate definition (routes, data model, and intended UX). IMPACT: blocks “direct-to-WorkSlate” final wiring. ASSUMING: WorkSlate is a lightweight, mobile-first “action canvas” that can store pinned context items and trigger task creation.**

## One-handed mobile UX spec for OmniVision

### Thumb-first control surface

The UX pattern is a **single, dominant action** with a predictable 3-step flow:

**Scan → Confirm → Send**

Implementation details:

- **Primary trigger:** Center FAB or nav item “Scan” (camera icon), reachable by thumb at the bottom edge. fileciteturn68file0L1-L1
- **Capture method:** default `<input type="file" accept="image/*" capture="environment">` because it is zero-dependency and OS-native one-handed. citeturn6search1turn7search1
- **Fast confirm UI:** Full-screen preview with three primary buttons at bottom:
  - **Retake**
  - **Redact**
  - **Use**
- **Redaction:** draw-to-blur rectangles (finger drag). Redaction map persists inside the ContextPack. (This is privacy-critical for enterprise screenshots.)
- **Send destination selector:** single segmented control:
  - **APEX Agent**
  - **OmniSlate**
  - **Both**
    Defaults to last-used choice for muscle memory.

### Secondary intake path: share sheet (zero friction, truly one-handed)

Upgrade the PWA share target:

- Extend manifest `share_target.params.files` to accept image MIME types, per MDN example. citeturn5search3turn7search8
- Store incoming shared files in Cache/IndexedDB as MDN recommends, then open the Vision Dock with the pending intake. citeturn5search3
- Keep the action stable: Share → OmniLink opens directly into Confirm screen.

### Controls and comprehension rules

To maintain Apple-grade simplicity:

- Never show more than **one primary action** at a time.
- Replace technical language:
  - “Extract” → “Read”
  - “ContextPack” → “Notes”
  - “Retention” → “Auto-delete”
- Provide a single “Privacy” line under the confirm button:  
  “Processed on your device. Not uploaded.”

## Implementation plan with regression-free gates and overload/failure handling

### Delivery checklist (use before writing code)

- Confirm “no image bytes to network” instrumentation plan exists (dev + CI).
- Confirm vision cache ceiling + eviction policy is specified.
- Confirm worker pipeline has cancellation + teardown.
- Confirm agent attach format is prompt-injection safe (strict delimiting).
- Confirm one-handed layout respects safe areas and 44px+ touch targets (already an OmniLink standard). fileciteturn64file9L1-L1

### Phased build (MVP-first, no new dependencies)

**Phase A: Visual intake plumbing (no OCR yet, still valuable)**

- Add **Scan** entry point (bottom nav/FAB).
- Implement `<input capture>` flow and share-target file acceptance.
- Build `VisionCacheController` using Cache API (mirroring existing cache governor patterns). fileciteturn54file0L1-L1 citeturn8search1turn8search0
- Implement preprocessing in a worker using OffscreenCanvas (resize, normalize). citeturn8search3
- “Send to Agent” ships **user-confirmed transcription** only:
  - User taps “Add note” (short text)
  - Attach the **local-only pointer** `vision://{hash}` plus the note text
  - This preserves the no-upload invariant while still integrating with agent flows.

**Phase B: True on-device text extraction (OCR) using WebGPU compute path**

- Implement a WebGPU-backed OCR kernel path (WGSL compute shaders) with a minimal model format stored locally.
- Use `navigator.gpu.requestAdapter()` / `requestDevice()` in a worker when available. citeturn6search0turn6search4turn6search3turn6search7
- Enforce a strict fallback: if WebGPU is unavailable, the UX stays functional (manual confirm path), never degrading into server upload.

**Phase C: WorkSlate hard integration + governance**

- Define WorkSlate data model (pinboard list, tags, retention, export).
- Add enterprise controls: disable vision, forced TTL, forced redaction.
- Add automated policy checks at runtime: block capture on restricted screens (admin-configurable).

### Failure modes and escalation paths

- **Permission denied (camera):** fallback immediately to “Choose from Photos” (same `<input type="file" accept="image/*">` without capture) and show a single-line fix: “Enable camera in Settings.” (No loops, no nag screens.) citeturn5search2
- **Storage quota exceeded:** evict LRU entries until under the ceiling (same design as existing cache governor) and proceed without crashing. fileciteturn54file0L1-L1
- **Worker crash / GPU failure:** restart once, then lock to manual path for the session (overload-free, no infinite retries).
- **Share target POST not handled:** service worker must explicitly handle the POST intake route; otherwise fail open to a normal route + user instruction. (`public/sw.js` is the control plane). fileciteturn72file0L1-L1
- **Prompt injection risk via OCR text:** wrap extracted text in a strict delimiter block and attach provenance metadata (“source: local vision; redactions applied”). This prevents the OCR stream from acting as instruction.

### Verification gates (must-pass CI)

- **No-network test:** Playwright test captures an image and asserts there are **no fetch/XHR/WebSocket payloads** containing image-like byte signatures during the pipeline.
- **Idempotency test:** Same image twice yields same `vision_context_id`.
- **Main-thread budget test:** Interaction remains responsive during preprocessing (no long tasks > 50ms while the confirm screen is interactive).
- **Privacy test:** “Clear Vision Data” deletes all `vision://` cache entries and ledger entries.

## Highest-impact next action

Implement **Phase A (Visual intake plumbing)** as a feature-flagged vertical slice: **Scan FAB + Share-to-OmniLink (images) + worker preprocessing + local `vision://` storage + “Attach to APEX Assistant”**—with a hard CI gate proving **zero image bytes leave the device**.
