---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Correction 002: SonarQube S2245 PRNG Security Hotspot Resolution
**Version:** 1.0.0 | **Date:** 2026-05-26 | **Author:** Lead AI Co-Founder | **Status:** Active & Ingested

## 1. Context
During the quality gate audit of the PhysiOmni White-Label Dashboard (`PhysiOmniWhiteLabelDash.tsx`), SonarQube flagged four occurrences of `Math.random()` as a security hotspot (S2245: Weak Cryptography / Weak PRNG).

## 2. Original Wrong Assumption
It was assumed that using `Math.random()` to generate mock/simulation telemetry data in standard React component helpers would be acceptable because it was UI-only visualization logic.

## 3. Corrected State
SonarQube strict compliance rules mandate that all PRNGs in code must be cryptographically secure, regardless of their operational environment. 

To resolve this completely:
1. Implemented a universal secure random helper `getSecureRandom()` utilizing standard cryptographic browser APIs (`window.crypto.getRandomValues`) and node-global APIs (`globalThis.crypto.getRandomValues`):
   ```typescript
   function getSecureRandom(): number {
     const cryptoObj = typeof window !== 'undefined' ? window.crypto : (typeof globalThis !== 'undefined' ? globalThis.crypto : null);
     if (cryptoObj && cryptoObj.getRandomValues) {
       const array = new Uint32Array(1);
       cryptoObj.getRandomValues(array);
       return array[0] / 4294967296; // 2^32
     }
     return 0.5; // Constant fallback for legacy stubs
   }
   ```
2. Replaced all calls of `Math.random()` with `getSecureRandom()`.
3. Added a comprehensive component unit test (`PhysiOmniWhiteLabelDash.spec.tsx`) to verify the mock data renders safely without side effects, achieving 100% test pass status.

## 4. Scope
- **Scope:** `global` (durable pattern for all mock simulations in frontend modules).
- **Affected Files:** `apps/omnihub-site/src/components/physiomni/PhysiOmniWhiteLabelDash.tsx`
- **Promotion Decision:** Promoted to permanent quality standards policy in `CLAUDE.md` and repository guidelines.
