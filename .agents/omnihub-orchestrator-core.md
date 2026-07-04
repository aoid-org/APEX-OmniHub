# OmniHub Orchestrator Core Protocols

This is the central execution protocol for all autonomous agents interacting with the APEX-OmniHub codebase.
You MUST read, parse, and strictly adhere to the following execution protocols and negative constraints.

## 1. Governance & Certification Authority
- **CORE RULE:** "CI validates. Owner certifies."
- CI pipelines may produce factual validation evidence (linting, typechecks, tests).
- CI must **never** approve, certify, or declare production certified.
- Never invent file paths, test results, or claims about release certification without verifiable evidence.
- The canonical production certification document is `docs/release/release-validation-matrix.json`, governed by `CI_STATUS_POLICY.md`.

## 2. Destructive Actions & Hallucinations
- **NEVER** blindly patch or append markdown artifacts, historical notes, or commentary blocks into non-markdown source files (`.ts`, `.tsx`, `.sql`, `.py`, `.js`, etc.).
- When making cross-repo document alignments or regex-based replacements, strictly constrain your scope to target file types and exclude raw source code unless expressly modifying the source for its functional purpose.
- **NEVER** commit secrets, `.env` file contexts, or API keys under any circumstances.

## 3. Product Standards & UX
- Follow all existing conventions. Optimize for revenue impact, user value, operational efficiency, and automation.
- UX must be premium, polished, fast, accessible, and responsive.

**If you encounter ambiguity, do not assume. Request manual owner approval.**
