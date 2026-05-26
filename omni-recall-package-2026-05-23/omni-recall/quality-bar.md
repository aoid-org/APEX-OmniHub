# Quality Bar
**Version:** 1.1.0 | **Date:** 2026-05-26 | **Author:** Lead AI Co-Founder | **Status:** Audited & Active

Use this quality gate before treating Omni-Recall work as complete.

### Core Alignment Metrics

1. **Truthfulness:** No claim of automation or access beyond actual runtime capability.
2. **Traceability:** Important claims map to user statement, raw evidence, repo evidence, or tool evidence.
3. **Compounding Value:** Output should reduce future prompting or future drift.
4. **Low-Noise Design:** Default behavior should stay quiet unless intervention is warranted.
5. **Correction Memory:** Meaningful user corrections should update durable memory.
6. **Canonical Structure:** Prefer updating stable pages over creating duplicate summaries.
7. **Runtime Fit:** Design must work for GPT-agent memory and tool surfaces, not an imaginary platform.
8. **Temporal Clarity:** Use absolute dates when timing matters; default user timezone is `America/Edmonton`.
