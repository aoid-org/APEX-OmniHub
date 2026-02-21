# CROSS-SESSION PERSISTENCE (Long-Term Memory)

**Goal**: Preserve critical context between independent sessions without reprocessing the entire history.

## I. SESSION END PROTOCOL (The Handover)

**Trigger**: User says "Wrap up", "Save state", or closes the session.

**Steps**:

1. **Extract Core Entities**: List every Person, System, File path, and major Decision made.
2. **Compress Narrative**: Write a 3-sentence summary of _what happened_.
3. **Draft Next Steps**: List all open loops and pending actions.
4. **Format Output**:
   ```markdown
   # SESSION SUMMARY [YYYY-MM-DD]

   **Narrative**: [Summary]
   **Entities**: [List]
   **Next Steps**: [List]
   **Context Hash**: [Hash of last state]
   ```

## II. SESSION START PROTOCOL (The Reload)

**Trigger**: New session starts with "Restore Context" or similar.

**Steps**:

1. **Read Last Summary**: Ingest the `SESSION SUMMARY` from the previous run.
2. **Rehydrate Entities**: Load the entity list into [Short-Term Memory].
3. **Verify State**: Ask user "Last time we ended with [Summary]. Is this still accurate?"
4. **Resync**: If confirmed, proceed. If denied, trigger [Context Compaction] and ask for current state.

## III. PROJECT LOG (The Ledger)

**Pattern**: "Immutable Record"
**Use Case**: Multi-week projects.

**Protocol**:

- Maintain a `project_log.md` file.
- **Append Only**: Never delete past entries.
- **Entry Format**:
  `[Date] [Actor]: [Action] -> [Result]`

## IV. ARTIFACT PERSISTENCE (The File System)

**Rule**:

- **Code**: Must be saved to disk (files).
- **Knowledge**: Must be saved to `docs/`.
- **Context**: Must be saved to `logs/` or `memory/`.

**Never** rely on the LLM's internal context window for storage of code or critical data. Always write to file.
