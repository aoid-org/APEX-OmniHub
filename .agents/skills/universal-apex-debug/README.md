# universal-apex-debug v1.0.0 — Universal Edition

> *"Stop patching symptoms. Find the source. Break the loop. Structurally. Forever."*

**Universal (Vendor-Agnostic) Edition** | Replaces: `universal-debug`

Compatible with: Claude, GPT-4o, Gemini, Mistral, Llama 3, Groq, and any instruction-following model.

---

## One-Line Install

```bash
# Any agent framework supporting folder-based skills (Agent Skills format)
npx skills add https://github.com/apexbusiness-systems/apex-skills --skill universal-apex-debug

# Manual install — copy the folder, reference SKILL.md as the entry point
# For runtimes without code execution, follow references/universal-protocol.md
```

---

## What It Does

Forges definitive root-cause solutions across **code, systems, product, strategy, and life**
using the upgraded APEX 7-step protocol with:

- **STEP 0 Triage Gate** — classify domain + severity in 60 seconds; route to fast path
- **5 Domain Fast Paths** — skip to the right steps when domain is confirmed
- **Adversarial Gate** — 4-challenge STORIED-derived discipline before declaring solved
- **Blast-Radius Containment** — every fix is surgical and regression-safe
- **IAS Tier Selection** — match reasoning depth to blast radius (references/ias-tiers.md)
- **Full Attack Matrix** — adversarial probes per domain (references/adversarial-patterns.md)

---

## Before / After

| | Without skill | With universal-apex-debug |
|--|--|--|
| Recurring bug | "We've fixed this 3 times" | Root cause traced, prevention structural, loop closed |
| Decision loop | Analysis paralysis | Smallest reversible experiment, decision made, metrics set |
| AI prompt loop | Generic outputs persist | Vague input architecturally blocked |
| Token load | 441 lines (universal-debug) | 207 lines — 53% reduction |

---

## Files

```
universal-apex-debug/
├── SKILL.md                         ← entry point
├── MANIFEST.json
├── scorecard.json
├── README.md
├── evals/
│   └── trigger-eval.json            ← 10 / 10 trigger eval
└── references/
    ├── domain-playbooks.md          ← deep playbooks per domain
    ├── evidence-protocol.md         ← STORIED trace template + claim policy
    ├── universal-protocol.md        ← manual gates for no-code runtimes
    ├── adversarial-patterns.md      ← full attack matrix by domain
    └── ias-tiers.md                 ← IAS tier selection (apex-boost derived)
```

---

## Vendor Compatibility

The 7-step protocol and adversarial gate require no tooling and run on any model.
APEX/Claude-specific integration references in SKILL.md are advisory.
For non-APEX stacks: substitute equivalent tools at Steps 2–5 and post-Step 7.

---

**APEX Business Systems Ltd.** | Edmonton, AB, Canada
