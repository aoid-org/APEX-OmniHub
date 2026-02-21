# MULTI-AGENT COORDINATION (Hive Mind Memory)

**Goal**: Enable multiple distinct agents to share context without duplication or conflict.

## I. SHARED KNOWLEDGE BASE (The Hub)

**Pattern**: "Hub and Spoke"
**Structure**:

- `shared/knowledge/`: Central repository.
- `agent_A/local_context/`: Private memory.
- `agent_B/local_context/`: Private memory.

**Protocol**:

1. **Read**: All agents can read `shared/knowledge/`.
2. **Write**:
   - **Local**: Agents write to their own folder freely.
   - **Shared**: Agents _propose_ writes to `shared/knowledge/` via a "Librarian" or "Coordinator" agent.
   - **Conflict**: If two agents disagree, the Coordinator decides based on [Timestamp] (Recency) and [Confidence Score].

## II. CONTEXT HANDOFF (The Baton Pass)

**Trigger**: Agent A completes a task and triggers Agent B.

**Protocol**:

1. **Agent A** summarizes its _final state_ into a `handoff_packet.json`:
   ```json
   {
     "task_id": "123",
     "status": "partial_success",
     "output_files": ["file1.py", "file2.md"],
     "blocking_issues": ["error in module X"],
     "context_summary": "Attempted X, failed at Y due to Z."
   }
   ```
2. **Agent B** reads `handoff_packet.json` as its _initial prompt_.
3. **Agent B** executes.

## III. DISTRIBUTED BUDGETING (Token Economy)

**Rule**:

- **Total System Context**: Sum of all active agent windows.
- **Limit**: $T_{max}$ (e.g., 100k tokens).

**Algorithm**:

1. **Allocation**: Assign tokens based on **Task Priority**.
   - **Critical Path**: 50% of budget.
   - **Support Tasks**: 30% of budget.
   - **Background/Research**: 20% of budget.
2. **Monitoring**: If an agent exceeds its budget, trigger [Compression Protocol] immediately.
3. **Preemption**: High-priority agents can "steal" budget from lower-priority ones (forcing them to compress or summarize).
