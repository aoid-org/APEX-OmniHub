/**
 * WorkflowHeader — Name input + action buttons for WorkflowBuilder
 * Extracted from WorkflowBuilder.tsx to reduce component size.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkillForgeWidget } from '@/components/skills/SkillForgeWidget';
import { Save, Play, Loader2, GitBranch } from 'lucide-react';

interface WorkflowHeaderProps {
  workflowName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onRun: () => void;
  savePending: boolean;
  runPending: boolean;
  hasNodes: boolean;
}

export const WorkflowHeader = memo(function WorkflowHeader({
  workflowName,
  onNameChange,
  onSave,
  onRun,
  savePending,
  runPending,
  hasNodes,
}: WorkflowHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-3">
        <GitBranch className="h-5 w-5 text-primary" />
        <Input
          value={workflowName}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-lg font-semibold w-64"
          placeholder="Workflow name"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <SkillForgeWidget />
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={savePending || !hasNodes}
        >
          {savePending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Save
        </Button>
        <Button
          size="sm"
          onClick={onRun}
          disabled={runPending || !hasNodes}
        >
          {runPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          Run Now
        </Button>
      </div>
    </div>
  );
});
