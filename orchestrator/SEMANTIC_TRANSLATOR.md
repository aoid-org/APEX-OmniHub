---
version: 1.1.0
last_audited: 2026-07-02
status: relocated
---

# Semantic Translator — moved

This specification describes the **OmniConnect** translation layer
(`SemanticTranslator`, `CanonicalEvent`, connector pipeline), whose
implementation lives in `src/omniconnect/` — not in `orchestrator/`.
Housing the spec here misrepresented it as an orchestrator capability
(AUDIT_2026-07.md M5), so it now lives beside its code:

→ **`src/omniconnect/SEMANTIC_TRANSLATOR.md`**

Implementation: `src/omniconnect/translation/translator.ts` ·
Tests: `tests/omniconnect/semantic-translation.test.ts`.

Orchestrator-side event translation (TS ↔ Python EventEnvelope) is a
different mechanism, documented in `orchestrator/models/events.py`
(`SchemaTranslator`) and `supabase/functions/_shared/event-ingress-adapter.ts`.
