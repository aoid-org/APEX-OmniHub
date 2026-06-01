# Design Example (condensed)

**Mode**: design  
**Assumptions**: mobile, one-handed, intermittent network.

❌ Failures: unclear primary action; no error/offline; top-only CTA.

**Plan**: job story → flow → state matrix → wireframes → UI tokens → prototype.

**Artifact**: State matrix
Step | loading | error | empty | success | offline
Search | skeleton | retry | suggestions | results | cached results + banner

**Verification**: 5-task test pass ≥4/5; a11y labels + contrast; tap targets.
