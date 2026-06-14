---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# PR-1274: Cloudflare Pages Deploy — Root Cause & Remediation

**Branch:** `feature/omnidash-from-zero-gap-closure`  
**Commit SHA (pre-patch):** `7c31fb62b3e7b397acae8dae3d0e1be4d0eaa0e4`  
**Date:** 2026-06-01  
**Author:** APEX-Antigravity (automated patch)

---

## Issue Summary

GitHub CI was green. Cloudflare Pages build was stuck/pending and did not complete deployment after GitHub checks passed.

---

## Root Cause Analysis

### RC-1: Avatar PNGs in Vite's Static Import Graph

Five avatar PNGs were statically imported into TypeScript source files:

| File | Import |
|---|---|
| `ApexAgentAvatar.tsx` | `import navigatorAvatar from '../../src/assets/avatars/navigator-avatar-icon.png'` |
| `ApexAgentAvatar.tsx` | `import companionAvatar from ...` |
| `ApexAgentAvatar.tsx` | `import sentinelAvatar from ...` |
| `ApexAgentAvatar.tsx` | `import pulseAvatar from ...` |
| `PersonaModal.tsx` | Same 4 imports |
| `AgentPane.tsx` | `import sentinelAvatar from '../../../../src/assets/avatars/sentinel-avatar-icon.png'` |
| `OmniDashShell.tsx` | `import imgAvatar from '../src/assets/avatars/avatar-default.png'` |

**Effect:** Vite base64-inlines or hashes and copies PNGs into `dist/assets/`. The largest file is `navigator-avatar-icon.png` at **~1 MB**. This adds to bundle processing time and can cause Cloudflare Pages workers/bundler timeouts on large assets.

### RC-2: Visualizer Runs on Every Production Build

`vite.config.ts` ran `rollup-plugin-visualizer` on every build where `mode !== 'test'`. This generates `dist/stats.html` with brotli + gzip analysis of every module — extra work on every Cloudflare Pages build, adding latency.

---

## Files Patched

### A) `public/avatars/` created (repo root)

Five PNGs copied to `public/avatars/`:
- `avatar-default.png` (202 KB)
- `companion-avatar-icon.png` (200 KB)
- `navigator-avatar-icon.png` (987 KB)
- `pulse-avatar-icon.png` (197 KB)
- `sentinel-avatar-icon.png` (204 KB)

Served by Cloudflare Pages CDN at `/avatars/*.png` — zero build-time processing.

### B) `apps/omnihub-site/dashboard/contracts/agentAvatars.ts`

New exports added:
- `AVATAR_BASE_PATH = '/avatars'`
- `AVATAR_PATH_MAP` — named agent → `/avatars/*.png`
- `avatarPath(filename)` — helper
- `agentNameFromAvatarFile()` — behavior unchanged

### C) Static PNG imports removed from 4 consumers

All components now use `AVATAR_PATH_MAP` from the contract — zero bundled PNGs.

### D) `vite.config.ts` — Visualizer opt-in

`analyzeBundle && mode !== 'test' && visualizer(...)` — only runs when `ANALYZE_BUNDLE=true`.

---

## Verification Commands

```bash
npm run typecheck            # tsc --noEmit
npm exec -- eslint . --max-warnings 0
npm run test
APEX_ALLOW_MISSING_SUPABASE_CONFIG=true npm run build

# No static PNG imports in avatar consumers:
grep -R "from .*avatar.*\.png\|import .*avatar.*\.png" -n \
  apps/omnihub-site/dashboard apps/omnihub-site/src tests || true

# Five approved PNGs in public/avatars/:
find public/avatars -maxdepth 1 -type f -name "*.png" -print
```

---

## Status

- Local build: **PENDING** (verification in progress)  
- Cloudflare Pages: **Retrigger required** after this commit is pushed  
- **Do not merge until Cloudflare Pages check is complete**
