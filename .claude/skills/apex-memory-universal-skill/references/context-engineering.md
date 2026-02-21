# CONTEXT ENGINEERING (Advanced Patterns)

**Goal**: Maximize the utility of the context window using structural patterns and agentic delegation.

## I. SUB-AGENT DELEGATION (Context Forking)

**Pattern**: "Divide and Conquer"
**Use Case**: Deep research or massive code refactoring tasks that would flood the main context.

**Protocol**:

1. **Fork**: Create a new, temporary context window (Sub-Agent).
2. **Delegate**: Send _only_ the specific task and relevant file subset to the Sub-Agent.
3. **Execute**: Sub-Agent performs the work (e.g., reading 50 files).
4. **Summarize**: Sub-Agent returns _only_ the final answer + a 10-line summary.
5. **Merge**: Main Agent integrates the summary. Discards the Sub-Agent's raw context context.

**Result**: 100k tokens of work processed for the cost of 500 tokens of summary.

## II. STRUCTURED NOTE-TAKING (The Scratchpad)

**Pattern**: "External Brain"
**Use Case**: Long-running threads with evolving constraints.

**Protocol**:

- Maintain a separate artifact (e.g., `scratchpad.md` or `project_state.xml`) at the very top or bottom of the context.
- **Update Rule**: Whenever a major decision is made, update the Scratchpad.
- **Retrieval Rule**: Read the Scratchpad _before_ answering any complex question.

**Format**:

```markdown
# ACTIVE STATE

- Current Goal: [Goal]
- Last Milestone: [Milestone]
- Active Constraints: [List]
```

## III. SLIDING WINDOW MANAGEMENT (Rolling Context)

**Pattern**: "Moving Spotlight"
**Use Case**: Infinite streaming logs or chat history.

**Protocol**:

- **Window Size**: Fixed at $N$ tokens (e.g., 8000).
- **Slide**: When $N+1$ arrives, drop token $0$ (unless it's an Attention Sink).
- **Snapshot**: Before dropping a block of tokens, generate a "Snapshot Summary" and append it to the [Long-Term Memory] log.

## IV. CONTEXT COMPACTION (The Reset)

**Pattern**: "Tabular Reset"
**Use Case**: Context is messy/fragmented after long debugging.

**Protocol**:

1. **Halt**: "Context is fragmented. Initializing Compaction."
2. **Table**: Create a table of "Knowns" vs "Unknowns".
3. **Reset**: Instruct the user or system to clear context and feed _only_ the Table back in as the new prompt.
