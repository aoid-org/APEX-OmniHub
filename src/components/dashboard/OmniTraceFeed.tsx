/**
 * OmniTraceFeed — High-density realtime trace timeline widget.
 * Displays latest trace events with smooth entry animations.
 */

import { useOmniTrace, type TraceEvent } from '@/hooks/useOmniTrace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  FAILED: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
};

const KIND_LABELS: Record<string, string> = {
  tool: '🔧',
  model: '🧠',
  policy: '🛡️',
  cache: '💾',
  system: '⚙️',
};

function TraceEventRow({ event }: Readonly<{ event: TraceEvent }>) {
  const statusStyle = STATUS_STYLES[event.kind === 'system' ? 'PENDING' : 'SUCCESS'] ?? STATUS_STYLES.PENDING;
  const kindLabel = KIND_LABELS[event.kind] ?? '📌';
  const latencyDisplay = event.latency_ms === null ? '—' : `${event.latency_ms}ms`;

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors animate-in slide-in-from-top-1 duration-300">
      <span className="text-base flex-shrink-0" title={event.kind}>
        {kindLabel}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {event.workflow_id.slice(0, 12)}… · {event.event_key}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusStyle)}>
          {event.kind}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {latencyDisplay}
        </div>
      </div>
    </div>
  );
}

interface OmniTraceFeedProps {
  workflowId?: string;
  maxItems?: number;
}

export function OmniTraceFeed({ workflowId, maxItems = 15 }: Readonly<OmniTraceFeedProps>) {
  const { traces, isTracing } = useOmniTrace(workflowId);
  const displayTraces = traces.slice(0, maxItems);

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          OmniTrace
          {isTracing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {traces.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {displayTraces.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No trace events yet. Run a workflow to see activity here.
          </div>
        ) : (
          <div className="divide-y divide-border/40 px-2">
            {displayTraces.map((event) => (
              <TraceEventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
