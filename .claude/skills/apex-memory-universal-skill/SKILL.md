# APEX-MEMORY (Universal)

**Mission**: Exponentially enhance AI memory and context retention through intelligent compression, verification, and persistence protocols.

## I. CONTRACT

**Input**: Any long-context conversation, complex task, or multi-session workflow.
**Output**: Optimized context window with >90% information retention and <1% hallucination rate.
**Success**: You reference facts from 50+ turns ago with perfect accuracy and zero drift.

---

## II. TRIAGE PROTOCOL (Start Here)

**What is the current memory state?**

```
CONTEXT STATE?
|
+-- NEW SESSION / LOW CONTEXT (<4k tokens)
|   -> Action: Log session start time. Initialize Short-Term Memory.
|   -> Protocol: Await 5 user turns before first compression.
|
+-- MEDIUM CONTEXT (4k-32k tokens)
|   -> Action: Activate Compression Protocol (Section III.1).
|   -> Focus: Summarize turns 1-(N-5). Preserve last 5 turns verbatim.
|   -> Run Deduplication Scan every 10 turns.
|
+-- HIGH CONTEXT (>32k tokens)
|   -> Action: Activate Deep Optimization + Hallucination Check.
|   -> Focus: Aggressive map-reduce summarization.
|   -> Promote critical facts to Long-Term Memory.
|   -> Consider Sub-Agent Delegation (references/context-engineering.md).
|
+-- SESSION END / TRANSITION
    -> Action: Activate Persistence Protocol (Section III.3).
    -> Focus: Consolidate memory into a portable summary block.
```

---

## III. CORE PROTOCOLS

### III.1 -- Compression Protocol (The "100x Engine")

**Trigger**: Every 10 turns OR when context > 75% full.

**NEVER**:

- [x] Summarize code blocks (keep verbatim with line refs).
- [x] Compress user instructions (keep verbatim).
- [x] Remove "Attention Sinks" (first 4 tokens of conversation).
- [x] Delete the most recent 5 turns (recency zone).
- [x] Merge distinct topics into a single summary.

**ALWAYS**:

- [+] Primacy-Recency Split: Preserve first 20% + last 10% verbatim. Compress middle 70%.
- [+] Semantic Dedup: Scan for >80% similar blocks -> keep canonical instance only.
- [+] Map-Reduce: Chunk middle context (1000 tok/chunk) -> summarize each -> merge chronologically.
- [+] Entity Extraction: Before compressing, extract ALL named entities into a retained index.
- [+] Quality Gate: After compression, verify fact retention >=90%. If <90%, reduce ratio.

**Deep Dive**: [Compression Algorithms Reference](references/compression-algorithms.md)

### III.2 -- Verification Protocol (The "Zero Hallucination Shield")

**Trigger**: Every response containing specific factual claims about context.

**Decision Tree**:

```
CLAIM TYPE?
+-- General knowledge (e.g., "Python is interpreted")
|   -> State directly. No verification needed.
|
+-- Context-specific fact (e.g., "User's deploy target is AWS")
|   +-- Found in Memory Tiers (with Turn #)?
|   |   -> State fact. Internally cite source turn.
|   |
|   +-- NOT found in any Memory Tier?
|       -> STOP. Say: "I don't have that in our current context."
|       -> NEVER fabricate. NEVER guess. NEVER infer without flagging.
|
+-- Inferred conclusion (e.g., "Based on the error, the issue is X")
|   -> State with hedge: "Based on [evidence], it appears that..."
|   -> Cite the evidence explicitly.
|
+-- Future/temporal claim (beyond knowledge cutoff)
    -> BLOCK. State cutoff boundary.
```

**Deep Dive**: [Hallucination Prevention Reference](references/hallucination-prevention.md)

### III.3 -- Persistence Protocol (Cross-Session Memory)

**Trigger**: "Save context", "Wrap up", session end, or explicit user request.

**Execution Steps**:

1. **Extract**: All People, Systems, Files, APIs, Decisions, Constraints.
2. **Summarize**: 3-sentence narrative of what was accomplished.
3. **Pending**: List all open loops and unfinished actions.
4. **Output Format**:

```markdown
# APEX-MEMORY SESSION DUMP [YYYY-MM-DD HH:MM]

**Session ID**: [unique-id]
**Narrative**: [3-sentence summary]
**Critical Facts**:

- [Fact 1] (Source: Turn #)
- [Fact 2] (Source: Turn #)
  **Entities**: [People, Systems, Files]
  **Pending Actions**: [List]
  **Constraints**: [Active rules/preferences]
  **Context Hash**: [integrity check]
```

**Deep Dive**: [Cross-Session Persistence Reference](references/cross-session-persistence.md)

---

## IV. THE 3-TIER MEMORY ARCHITECTURE

```
TIER 1: SHORT-TERM (Working Memory)
  - Last 10-20 turns - 100% fidelity - Real-time updates
  - PROMOTE when: referenced 3+ times, flagged important

TIER 2: MEDIUM-TERM (Session Memory)
  - Compressed summaries - 90% accuracy - Key facts only
  - PROMOTE when: cross-topic relevance, user preference

TIER 3: LONG-TERM (Persistent Memory)
  - Critical entities + constraints - 95%+ accuracy
  - External storage (files, logs, vector DB)
  - NEVER deleted. Append-only.
```

**Deep Dive**: [Memory Architecture Reference](references/memory-architecture.md)

---

## V. ADVANCED CAPABILITIES

- **Sub-Agent Delegation**: Fork context for deep research -> [Context Engineering](references/context-engineering.md)
- **Multi-Agent Coordination**: Share memory across agent swarms -> [Multi-Agent Coordination](references/multi-agent-coordination.md)
- **Structured Note-Taking**: Maintain external scratchpads for evolving constraints
- **Context Compaction**: Emergency reset with tabular state transfer

---

## VI. SCRIPTS (Deterministic Operations)

```bash
# Compress a context file with quality verification
python scripts/apex_compress.py input.txt --ratio 5 --output compressed.txt

# Audit a response for potential hallucinations
python scripts/apex_verify.py response.txt --context conversation.txt

# Generate a session memory dump
python scripts/apex_persist.py conversation.txt --output memory_dump.md

# Full optimization pipeline
python scripts/apex_optimize.py input.txt --stats --output optimized.txt
```

---

## VII. ACTIVATION

**AUTO-ACTIVATION** (No manual invocation needed):

- Every conversation turn (background optimization)
- Long conversations (>10 messages)
- Complex multi-step reasoning
- Information-dense interactions
- Cross-session continuity requirements

**MANUAL OVERRIDES** (Optional):

- "Activate APEX-Memory maximum capacity" -> Full deep optimization
- "APEX-Memory compress" -> Force immediate compression
- "APEX-Memory stats" -> Display optimization metrics
- "APEX-Memory persist" -> Generate session dump
- "APEX-Memory verify" -> Audit current response for hallucinations

---

_APEX-Memory v2.0.0 -- Proprietary Technology of APEX Business Systems Ltd._
_Patent Pending. All Rights Reserved. Unauthorized use prohibited._
