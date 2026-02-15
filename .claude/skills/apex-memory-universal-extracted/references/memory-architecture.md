# MEMORY ARCHITECTURE (3-Tier System)

**Goal**: Organize context hierarchically to balance retention (Near-perfect) with capacity (10x).

## I. TIER 1: SHORT-TERM MEMORY (Working Context)

**Capacity**: ~2000-4000 tokens (Last 10-20 turns).
**Retention**: 100% Fidelity (Verbatim).
**Protocol**:

- **Ingest**: Every user message enters here first.
- **Hold**: Keep most recent exchanges fully intact for immediate recall.
- **Overflow**: When >4000 tokens, trigger [Compression Protocol] to move older content to Tier 2.

## II. TIER 2: MEDIUM-TERM MEMORY (Session Context)

**Capacity**: ~4000-10,000 tokens (Compressed Summaries).
**Retention**: ~90% Accuracy (Key Facts Only).
**Protocol**:

- **Format**: Structured Bullet Points.
- **Transformation**: "Map-Reduce" summarization of Tier 1 overflow.
- **Focus**: Tasks, Decisions, Code Snippets (referenced by line #), User Constraints.
- **Overflow**: When >10,000 tokens, allow "lossy compression" of oldest summaries (Tier 3).

## III. TIER 3: LONG-TERM MEMORY (Persistent Context)

**Capacity**: Unlimited (External / Rag / Highly Compressed).
**Retention**: ~85% Accuracy (Critical Entities).
**Protocol**:

- **Storage**: External Vector DB or Append-Only Markdown Log.
- **Content**: User Profile, Project Metadata, Final Decisions, "Immutable Truths".
- **Retrieval**: Only fetched when specifically triggered by a [Keyword Match] or [Semantic Search].

---

## IV. PROMOTION / DEMOTION RULES

### Promotion (Tier 1 -> Tier 2/3)

**Promote IF**:

- Fact is referenced >3 times.
- User explicitly says "Remember this".
- Information is a "Constraint" (e.g., "Always use Python").

### Demotion (Tier 1 -> Tier 2)

**Demote IF**:

- Turn is >20 turns old.
- Topic has changed completely (e.g., "Debugging SQL" -> "CSS styling").

### Deletion (Trash)

**Delete IF**:

- Phatic communication ("Hello", "Thanks").
- Resolved confusion chains ("What did you mean?" -> "Oh I see").
- Redundant error logs (Keep only the _first_ instance and the _fix_).
