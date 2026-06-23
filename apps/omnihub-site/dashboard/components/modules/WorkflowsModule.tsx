import { useMemo } from 'react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import type { ModuleListItem } from '@/dashboard/components/ModuleRegistry';

interface Props {
  readonly onClose: () => void;
}

const STATUS_COLOR: Readonly<Record<string, string>> = {
  active:   '#34d399',
  pending:  '#facc15',
  inactive: '#6b7280',
  error:    '#ef4444',
};

function parseSteps(detail: string | undefined): number {
  const m = detail?.match(/(\d+)\s+step/);
  return m ? Math.min(Number(m[1]), 12) : 4;
}

function WorkflowLane({ item, y }: { item: ModuleListItem; y: number }) {
  const steps      = parseSteps(item.detail);
  const color      = STATUS_COLOR[item.status] ?? '#6b7280';
  const rowH       = 44;
  const midY       = y + rowH / 2;
  const startX     = 8;
  const trackStart = 160;
  const trackEnd   = 390;
  const stepSpacing = (trackEnd - trackStart) / Math.max(steps - 1, 1);

  const isDraft = item.status === 'pending';

  return (
    <g key={item.id}>
      {/* Row background */}
      <rect x={0} y={y + 3} width={428} height={rowH - 6} rx={6}
        fill={`${color}08`} stroke={`${color}20`} strokeWidth={1} />

      {/* Status dot */}
      <circle cx={startX + 8} cy={midY} r={5} fill={color} />
      {item.status === 'active' && (
        <circle cx={startX + 8} cy={midY} r={8} fill="none"
          stroke={color} strokeWidth={1} opacity={0.4} />
      )}

      {/* Label */}
      <text x={startX + 20} y={midY - 4} fontSize={11} fontWeight={600}
        fill="var(--omni-t1, #e2e8f0)" fontFamily="inherit">
        {item.label.length > 22 ? item.label.slice(0, 21) + '…' : item.label}
      </text>
      <text x={startX + 20} y={midY + 9} fontSize={9} fill="var(--omni-t3, #64748b)"
        fontFamily="inherit">
        {String(steps)} steps
      </text>

      {/* Connector line from label to first step */}
      <line x1={trackStart - 14} y1={midY} x2={trackStart} y2={midY}
        stroke={`${color}40`} strokeWidth={1.5} />

      {/* Step track */}
      <line x1={trackStart} y1={midY} x2={isDraft ? trackStart + stepSpacing * (steps - 1) * 0.6 : trackEnd}
        y2={midY} stroke={`${color}30`} strokeWidth={1.5} strokeDasharray={isDraft ? '4 3' : undefined} />

      {Array.from({ length: steps }, (_, i) => {
        const cx = trackStart + i * stepSpacing;
        const filled = !isDraft || i < Math.ceil(steps * 0.4);
        return (
          <rect key={i} x={cx - 4} y={midY - 4} width={8} height={8} rx={2}
            fill={filled ? color : `${color}25`}
            stroke={filled ? `${color}80` : `${color}30`} strokeWidth={0.5} />
        );
      })}

      {/* Terminal node */}
      <circle cx={trackEnd + 14} cy={midY} r={isDraft ? 5 : 6}
        fill={isDraft ? '#1e293b' : color}
        stroke={color} strokeWidth={isDraft ? 1.5 : 0} />
      {!isDraft && (
        <text x={trackEnd + 14} y={midY + 4} fontSize={9} textAnchor="middle"
          fill="#0f172a" fontWeight={700} fontFamily="inherit">✓</text>
      )}
    </g>
  );
}

export default function WorkflowsModule({ onClose }: Props) {
  const state = useOmniModuleState('workflows');

  const running = state.items.filter((i) => i.status === 'active').length;
  const pending = state.items.filter((i) => i.status === 'pending').length;
  const idle    = state.items.filter((i) => i.status === 'inactive' || i.status === 'error').length;

  const svgHeight = useMemo(() => state.items.length * 44 + 8, [state.items.length]);

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="space-y-3">
          {/* Summary legend */}
          <div className="flex items-center gap-3 text-xs px-1">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />{running} running
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />{pending} pending
            </span>
            {idle > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400" />{idle} idle
              </span>
            )}
          </div>

          {/* Visual canvas */}
          <div className="rounded-lg border border-border/30 bg-[rgba(11,18,32,0.6)] overflow-hidden">
            <div className="px-2 pt-1.5 pb-0.5 text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold">
              Workflow Pipeline View
            </div>
            <svg
              width="100%"
              viewBox={`0 0 428 ${svgHeight}`}
              aria-label="Workflow pipeline graph"
              role="img"
              style={{ display: 'block' }}
            >
              {state.items.map((item, idx) => (
                <WorkflowLane key={item.id} item={item} y={idx * 44 + 4} />
              ))}
            </svg>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
