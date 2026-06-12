---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Quality Bar

Use this quality gate before treating Omni-Recall work as complete.

1. Truthfulness: no claim of automation or access beyond actual runtime capability.
2. Traceability: important claims map to user statement, raw evidence, repo evidence, or tool evidence.
3. Compounding value: output should reduce future prompting or future drift.
4. Low-noise design: default behavior should stay quiet unless intervention is warranted.
5. Correction memory: meaningful user corrections should update durable memory.
6. Canonical structure: prefer updating stable pages over creating duplicate summaries.
7. Runtime fit: design must work for Claude Code and other multi-agent memory and tool surfaces, not an imaginary platform.
8. Temporal clarity: use absolute dates when timing matters; default user timezone is America/Edmonton.
