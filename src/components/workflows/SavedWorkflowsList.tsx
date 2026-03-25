/**
 * SavedWorkflowsList — List of persisted workflows with load action
 * Extracted from WorkflowBuilder.tsx to reduce component size.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNode, WorkflowEdge } from '@/lib/workflow-api';

interface SavedWorkflow {
  id: string;
  name: string;
  definition: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  is_active: boolean;
  schedule: string | null;
}

interface SavedWorkflowsListProps {
  workflows: SavedWorkflow[];
  onLoad: (workflow: SavedWorkflow) => void;
}

export const SavedWorkflowsList = memo(function SavedWorkflowsList({
  workflows,
  onLoad,
}: SavedWorkflowsListProps) {
  if (workflows.length === 0) return null;

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Saved Workflows</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {workflows.slice(0, 5).map((wf) => (
            <SavedWorkflowItem key={wf.id} workflow={wf} onLoad={onLoad} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------

interface SavedWorkflowItemProps {
  workflow: SavedWorkflow;
  onLoad: (workflow: SavedWorkflow) => void;
}

const SavedWorkflowItem = memo(function SavedWorkflowItem({
  workflow,
  onLoad,
}: SavedWorkflowItemProps) {
  const handleClick = useCallback(() => onLoad(workflow), [workflow, onLoad]);

  return (
    <button
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors flex items-center justify-between"
      onClick={handleClick}
    >
      <div>
        <p className="text-sm font-medium">{workflow.name}</p>
        <p className="text-xs text-muted-foreground">
          {workflow.definition.nodes.length} nodes · {workflow.is_active ? 'Active' : 'Inactive'}
        </p>
      </div>
      <Badge variant={workflow.is_active ? 'default' : 'secondary'} className="text-[10px]">
        {workflow.schedule ?? 'Manual'}
      </Badge>
    </button>
  );
});
