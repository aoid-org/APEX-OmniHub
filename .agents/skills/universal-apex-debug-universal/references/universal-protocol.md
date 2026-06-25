# Universal Protocol — Manual Gates for Runtimes Without Code Execution

Use this file when running universal-apex-debug in any agent or model that lacks
bash, Claude Code tools, or file system access. Every automated step becomes a
manually executed checklist item. The 7-step logic and adversarial gate are unchanged.

---

## STEP 0 — TRIAGE (manual)

Answer in plain text:
1. Domain class: A / B / C / D / E / F
2. Severity: P0 / P1 / P2
3. Fast path selected or full 7-step?

---

## STEPS 1–7 — Manual Execution Checklist

For each step, produce:
- [ ] Trigger condition met (yes/no + evidence)
- [ ] Execution output (stated in plain text or structured list)
- [ ] Gate passed (yes/no + one-line justification)

---

## ADVERSARIAL GATE — Manual

For each challenge, write:
```
[1] ASSUMPTION AUDIT
    Assumptions: [list]
    Evidence per assumption: [list or UNCERTAIN: gap]

[2] ADVERSARIAL PROBE
    Counter-argument: [strongest case against the fix]
    Response: [why it still holds, or what was changed]

[3] BLAST RADIUS CHECK
    What was working before: [list]
    Affected by fix: [yes/no + scope]
    Containment confirmed: [yes/no]

[4] RECURRENCE TEST
    Reproduction sequence: [steps that caused the loop]
    Structural block: [mechanism that prevents recurrence without manual intervention]
```

All four pass → solution validated. Document and close.

---

## Verification Trace (always append)

```
Goal:         
Assumptions:  
Checked:      
Found/fixed:  
Prevention:   
Confidence:   
```

---

## Vendor Compatibility

This skill is written against the open Agent Skills format:
folder name = skill name, entry = SKILL.md.

Vendor-specific tools referenced in SKILL.md integration section (omnidev-apex-pro-native,
apex-user-shoes-validation, apex-riddler) are Claude/OmniHub native.

For non-APEX runtimes, replace with equivalent domain tools in your stack.
The 7 steps and adversarial gate are vendor-agnostic and require no tooling.
