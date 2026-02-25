/**
 * WorkflowStudio — OmniDash page for Workflow Builder.
 */

import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';
import { OmniTraceFeed } from '@/components/dashboard/OmniTraceFeed';

export function WorkflowStudio() {
  return (
    <div className="space-y-6">
      <WorkflowBuilder />
      <OmniTraceFeed />
    </div>
  );
}

export default WorkflowStudio;
