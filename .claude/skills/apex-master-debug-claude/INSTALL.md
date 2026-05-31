# APEX-MASTER-DEBUG — Installation & Quick Start

## Package Contents

```
apex-master-debug-universal/    ← Vendor-agnostic (any LLM)
├── SKILL.md                    ← Full protocol
└── MANIFEST.json               ← Metadata

apex-master-debug-claude/       ← Claude native (Capabilities section)
├── SKILL.md                    ← Full protocol with tool integration
└── MANIFEST.json               ← Claude-specific metadata
```

---

## Install: Universal Package (Any LLM)

**For GPT, Gemini, Llama, Mistral, DeepSeek, or any LLM:**

1. Copy `apex-master-debug-universal/SKILL.md` content
2. Paste as a system prompt, custom instruction, or knowledge base entry
3. Activation: Mention any trigger word (debug, fix bug, crash, etc.)
4. Manual: *"Apply apex-master-debug protocol"*

---

## Install: Claude Native Package (Capabilities Section)

**For Claude — seamless Capabilities installation:**

```bash
# Method 1: Direct copy to skills directory
cp -r apex-master-debug-claude/ /mnt/skills/user/apex-master-debug/

# Method 2: From within Claude session
# Claude will auto-install if given the file and asked to install it
```

**Verify installation:**
```bash
ls /mnt/skills/user/apex-master-debug/SKILL.md
# Expected: file exists
```

**Activate in Claude:**
- Automatic: Triggers on any debug-related request
- Manual: *"Apply apex-master-debug protocol"* or *"Use APEX-MASTER-DEBUG"*

---

## Quick-Start Examples

### Reactive (Fix a live bug):
```
User: "Getting TypeError: Cannot read property 'id' of undefined at line 47"
→ Claude auto-activates REACTIVE MODE
→ Runs Phase 1–8 protocol
→ Delivers ONE str_replace fix with regression test
```

### Predictive (Pre-release audit):
```
User: "Can you review this PR before we ship to production?"
→ Claude auto-activates PREDICTIVE MODE
→ Runs threat scan with bash_tool grep patterns
→ Delivers risk-scored threat map + proactive fixes
```

### Performance:
```
User: "Our API endpoint is taking 8 seconds to respond"
→ Claude auto-activates PERFORMANCE MODE
→ Baselines, profiles, isolates, and fixes bottleneck
→ Commits benchmark diff and performance regression test
```

---

## Versioning

| Version | Supersedes | Key Additions |
|---|---|---|
| 1.0.0 | one-pass-debug (all) | Predictive mode, temporal RCA, blast radius, 4-pass simulation, automated threat scanning, risk scoring, proactive fix generation |

---

**APEX Business Systems Ltd. — Edmonton, AB, Canada**
**Copyright © 2026 All Rights Reserved**
