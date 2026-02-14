# COMPRESSION ALGORITHMS (2025 Edition)

**Goal**: Reduce token usage by 5x-10x while retaining critical "Attention Sinks" and semantic meaning.

## I. PRIMACY-RECENCY OPTIMIZATION (Weighted Retention)

**Theory**: LLMs recall information best at the start (Primacy) and end (Recency) of the context window. The middle is the "Lost Zone".

**Algorithm**:

1. **Identify Window**: Total Context Tokens = $T$.
2. **Zone 1 (Primacy)**: Keep first 20% of $T$ (tokens $0$ to $0.2T$). **DO NOT COMPRESS**.
   - _Why_: Contains system prompts, core definitions, initial user goals.
3. **Zone 3 (Recency)**: Keep last 10% of $T$ (tokens $0.9T$ to $T$). **DO NOT COMPRESS**.
   - _Why_: Contains immediate conversation flow.
4. **Zone 2 (Middle)**: The target for aggressive compression. Tokens $0.2T$ to $0.9T$.
   - _Action_: Apply Map-Reduce Summarization.

## II. MAP-REDUCE SUMMARIZATION (Middle Zone)

**Protocol**:

1. **Chunking**: Split Zone 2 into 1000-token chunks.
2. **Map (Summarize)**: For each chunk, generate a 200-token summary using this prompt:
   > "Extract all Facts, Decisions, and Entities. Discard phatic speech. Maintain code references."
3. **Reduce**: Merge summaries chronologically.
4. **Result**: A 5:1 compression ratio with preserved semantic timeline.

## III. SEMANTIC DEDUPLICATION (Logarithmic Compression)

**Trigger**: Recurring error logs, repetitive status updates.

**Algorithm**:

1. **Scan**: Identify repeating blocks >50 tokens with >80% similarity.
2. **Select Canonical**: Keep the first (defining) instance and the last (current) instance.
3. **Reference**: Replace intermediate instances with `[...Refer to Log Entry #1...]`.
4. **Result**: Logarithmic scaling of repetitive data.

## IV. ATTENTION SINK PRESERVATION (InfiniteHiP Inspired)

**Critical Rule**:

- **NEVER** remove the very first 4 tokens of the prompt/context.
- **Why**: "Attention Sinks" anchor the model's attention mechanism. Removing them causes massive perplexity spikes and "context crashing".
- **Action**: Always hard-code retention of the initial greeting or system instruction start.

## V. HIERARCHICAL PRUNING (Aggressive Mode)

Used when context > 95% full.

**Algorithm**:

1. **Score**: Assign an "importance score" to every sentence based on Entity Density (Named Entity Recognition).
2. **Filter**: Drop sentences with Score < Threshold (e.g., pure conversational filler).
3. **Retain**: Keep high-density sentences + logical connectors ("however", "therefore").
