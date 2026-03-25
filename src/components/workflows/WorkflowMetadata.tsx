/**
 * WorkflowMetadata — Schedule input, node/edge counts, connection indicator
 * Extracted from WorkflowBuilder.tsx to reduce component size.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface WorkflowMetadataProps {
  schedule: string;
  onScheduleChange: (schedule: string) => void;
  nodeCount: number;
  edgeCount: number;
  connectingFrom: string | null;
}

export const WorkflowMetadata = memo(function WorkflowMetadata({
  schedule,
  onScheduleChange,
  nodeCount,
  edgeCount,
  connectingFrom,
}: WorkflowMetadataProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Input
        value={schedule}
        onChange={(e) => onScheduleChange(e.target.value)}
        placeholder="Cron schedule (optional, e.g. 0 9 * * 1-5)"
        className="max-w-sm text-sm"
      />
      <Badge variant="secondary" className="text-xs whitespace-nowrap">
        {nodeCount} nodes · {edgeCount} edges
      </Badge>
      {connectingFrom && (
        <Badge variant="default" className="text-xs animate-pulse whitespace-nowrap">
          Click a target node to connect
        </Badge>
      )}
    </div>
  );
});
