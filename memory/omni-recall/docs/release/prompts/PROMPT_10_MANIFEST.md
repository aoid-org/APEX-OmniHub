---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# AG2 PROMPT 10 MANIFEST

## OmniModal / OmniSpatial Iframe Sandbox & CSP Enforcement

**Task:** Enforce strict APEX origin policies and zero-trust sandbox attributes for all dynamic `<iframe>` and HTML injections across the UI rendering surfaces.

### Executed Actions
1. **Created `iframeOriginPolicy.ts`:**
   - Implemented a fail-closed URL sanitiser that strips dangerous protocols (`javascript:`, `data:`), enforces HTTPS, and strictly blocks private/internal IP ranges (SSRF mitigation).
   - Defined origin allowlists: `FIRST_PARTY_ORIGINS`, `TRUSTED_PARTNER_ORIGINS`, and `DEMO_ONLY_ORIGINS`.
   - Mapped allowed origins to tiered `SandboxProfile`s (`first-party`, `trusted-partner`, `untrusted`), where untrusted origins lose `allow-same-origin`, preventing sandbox escapes.

2. **Updated `OmniAppShell.ts`:**
   - Modified the Shadow DOM custom element to pipe all `config.entryUrl` values through `sanitiseIframeUrl()`.
   - If blocked, the shell now renders a native DOM placeholder with the block reason, preventing the iframe from mounting.
   - If allowed, applies the dynamic sandbox attribute (e.g. removing `allow-same-origin` for untrusted origins) rather than the previous hardcoded, overly permissive string.

3. **Updated `OmniSpatialHost.tsx`:**
   - Modified the `SpatialPayloadRenderer` (used for `appType="media"`) to use the same `sanitiseIframeUrl()` policy logic.
   - Now renders a styled error component if the media URL is blocked, and applies the dynamic sandbox string if allowed.

4. **Created `csp-policy.md`:**
   - Documented the dual-layer security model (Global HTTP headers + Component-level Sandboxing).
   - Documented the exact rules evaluated by the origin sanitiser and the capabilities granted by each sandbox profile.

5. **Test Fixtures:**
   - Added `tests/lib/iframeOriginPolicy.spec.ts` to ensure the sanitiser successfully blocks malicious vectors (XSS, SSRF, non-HTTPS) while allowing authorized domains.
