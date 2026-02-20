/**
 * workflow-api — Supabase CRUD for workflows + workflow_runs.
 * Includes DAG cycle detection for save-time validation.
 */

import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  meta?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  definition: WorkflowDefinition;
  schedule: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  logs: unknown[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DAG Cycle Detection (Kahn's topological sort)
// ---------------------------------------------------------------------------

export function detectCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited++;
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return visited !== nodeIds.size; // true = cycle detected
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

const WORKFLOW_COLUMNS = 'id, user_id, name, definition, schedule, is_active, created_at, updated_at';
const RUN_COLUMNS = 'id, workflow_id, user_id, status, logs, error_message, created_at, updated_at';

export async function fetchWorkflows(userId: string): Promise<Workflow[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select(WORKFLOW_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Workflow[];
}

export async function fetchWorkflow(workflowId: string): Promise<Workflow> {
  const { data, error } = await supabase
    .from('workflows')
    .select(WORKFLOW_COLUMNS)
    .eq('id', workflowId)
    .single();

  if (error) throw new Error(error.message);
  return data as Workflow;
}

export async function saveWorkflow(
  userId: string,
  workflow: { id?: string; name: string; definition: WorkflowDefinition; schedule?: string | null; is_active?: boolean }
): Promise<Workflow> {
  // Validate acyclic
  if (detectCycle(workflow.definition.nodes, workflow.definition.edges)) {
    throw new Error('Workflow contains a cycle. DAG must be acyclic.');
  }

  const payload = {
    user_id: userId,
    name: workflow.name,
    definition: workflow.definition as unknown as Record<string, unknown>,
    schedule: workflow.schedule ?? null,
    is_active: workflow.is_active ?? true,
    ...(workflow.id ? { id: workflow.id } : {}),
  };

  const { data, error } = await supabase
    .from('workflows')
    .upsert(payload)
    .select(WORKFLOW_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data as Workflow;
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const { error } = await supabase.from('workflows').delete().eq('id', workflowId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Run Operations
// ---------------------------------------------------------------------------

export async function createWorkflowRun(workflowId: string, userId: string): Promise<WorkflowRun> {
  const { data, error } = await supabase
    .from('workflow_runs')
    .insert({ workflow_id: workflowId, user_id: userId, status: 'pending' })
    .select(RUN_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data as WorkflowRun;
}

export async function fetchWorkflowRuns(workflowId: string): Promise<WorkflowRun[]> {
  const { data, error } = await supabase
    .from('workflow_runs')
    .select(RUN_COLUMNS)
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as WorkflowRun[];
}
