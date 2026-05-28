# APEX-OmniHub Content Security Policy (CSP) & Sandbox Architecture

## Overview

APEX-OmniHub implements a strict, defense-in-depth approach to rendering third-party content within the platform. Rather than relying solely on global HTTP headers, we employ a dual-layered security architecture consisting of a **Strict Baseline CSP** and **Deterministic Sandbox Profiles**.

This document outlines the security boundaries enforced when loading external content into `OmniModal`, `OmniMedia`, `OmniSpatialHost`, and the `OmniAppShell` microfrontend container.

---

## 1. Zero-Trust Sandbox Isolation (`OmniAppShell`)

All third-party web content is rendered inside the `OmniAppShell` Web Component.

### The Shadow DOM Boundary
We do not inject third-party DOM nodes or CSS directly into the APEX React tree.
1. `OmniAppShell` mounts a closed (or securely managed open) **Shadow DOM**.
2. A strict CSS reset is injected inside the shadow root.
3. Third-party content (either raw HTML or an iframe) is mounted inside this boundary.
**Result:** No third-party CSS can bleed out to affect the APEX UI, and APEX styles do not leak into the hosted content.

---

## 2. Dynamic Origin Policy (`iframeOriginPolicy.ts`)

Every URL requested for rendering inside an iframe undergoes strict, synchronous validation before the DOM element is even created.

### The Sanitiser Rules (Evaluated in Order — Fail-Closed):
1. **Empty Rejection:** Null, undefined, or whitespace-only URLs are rejected.
2. **Protocol Denylist:** Any URL starting with `javascript:`, `data:`, `blob:`, `file:`, `ftp:`, or `vbscript:` is instantly blocked without parsing.
3. **Parse Check:** Malformed URLs that throw during `new URL()` instantiation are rejected.
4. **HTTPS Enforcement:** The protocol *must* be exactly `https:`. No exceptions.
5. **Network Segregation:** Hostnames resolving to private IPv4 ranges (10.x, 172.16-31.x, 192.168.x) or loopback addresses (`localhost`, `127.0.0.1`, `::1`) are strictly blocked. This prevents Server-Side Request Forgery (SSRF) style pivoting against developer environments or internal APEX APIs.
6. **Explicit Allowlists:** The origin must exist in one of our predefined lists.

### Origin Allowlists
- **First-Party Origins:** `omnihub.apexbusiness.ca`, `api.apexbusiness.ca`, etc.
- **Trusted Partners:** `www.youtube.com`, `open.spotify.com`, etc.
- **Demo Mode:** `demo.apexbusiness.ca` (strictly rejected in production unless the `VITE_IS_DEMO_MODE` flag is explicitly enabled).

Unknown origins fall through to a **Fail-Closed** block, rendering an error placeholder rather than loading the content.

---

## 3. Tiered Sandbox Profiles

Once an origin is allowed, it is assigned a **Sandbox Profile**. This profile maps directly to the `sandbox` attribute applied to the rendered `<iframe>`.

| Profile Name | Origin Match | Sandbox Capabilities | Security Posture |
| :--- | :--- | :--- | :--- |
| **`first-party`** | `FIRST_PARTY_ORIGINS` | `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox` | Trusted APEX components. Allows cross-frame communication via `postMessage`. |
| **`trusted-partner`** | `TRUSTED_PARTNER_ORIGINS` | `allow-scripts allow-presentation` | Restricted. Media players can use fullscreen, but cannot access parent DOM or submit forms. |
| **`untrusted`** | Fallback / Default | `allow-scripts` | Maximum restriction. No same-origin access, no popups, no forms, no top-navigation. |

> [!WARNING]
> We **NEVER** combine `allow-scripts` and `allow-same-origin` on an untrusted origin. Doing so would allow the framed content to remove the sandbox attribute entirely and escape the iframe boundary.

---

## 4. Global HTTP CSP Headers

The application is served with the following strict HTTP Response headers (enforced via Cloudflare / Nginx / Vercel edges):

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.apexbusiness.ca wss://realtime.apexbusiness.ca; frame-src 'self' https://www.youtube.com https://open.spotify.com;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

*(Note: In development, Vite's dev server configuration may relax `script-src` to allow Hot Module Replacement (HMR) eval, but production builds strictly forbid `unsafe-eval`.)*

## Escalation Path
If a new third-party integration is required:
1. Update `TRUSTED_PARTNER_ORIGINS` in `apps/omnihub-site/src/lib/iframeOriginPolicy.ts`.
2. Update the `frame-src` directive in the global HTTP CSP configuration.
3. Submit a PR. The APEX Governance policy scanner will flag the change for architecture review.
