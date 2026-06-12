/**
 * ModuleShell — Shared layout for all dynamic module panels.
 * Renders stats, items, actions, and optional custom content.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { OmniModuleState } from '@/hooks/useOmniModuleState';
import { triggerModuleAction } from '@/hooks/useOmniModuleState';

const STATUS_COLORS: Readonly<Record<string, string>> = {
  active: '#34d399',
  inactive: '#6b7280',
  pending: '#facc15',
  error: '#ef4444',
};

const TREND_ICONS: Readonly<Record<string, string>> = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2022',
};

const TREND_COLORS: Readonly<Record<string, string>> = {
  up: '#34d399',
  down: '#ef4444',
  stable: '#6b7280',
};

interface StateStyle {
  readonly background: string;
  readonly color: string;
  readonly border: string;
}

const STATE_KIND_STYLES: Readonly<Record<string, StateStyle>> = {
  live: {
    background: 'rgba(52,211,153,0.1)',
    color: '#34d399',
    border: '1px solid rgba(52,211,153,0.3)',
  },
  demo: {
    background: 'rgba(167,139,250,0.1)',
    color: '#a78bfa',
    border: '1px solid rgba(167,139,250,0.3)',
  },
  unavailable: {
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.3)',
  },
};

const DEFAULT_STATE_STYLE: StateStyle = {
  background: 'rgba(161,161,170,0.1)',
  color: '#a1a1aa',
  border: '1px solid rgba(161,161,170,0.3)',
};

interface ModuleShellProps {
  readonly state: OmniModuleState;
  readonly onClose: () => void;
  readonly children?: React.ReactNode;
  readonly onAction?: (actionId: string, selectedItems: string[]) => Promise<boolean | void> | boolean | void;
}

export const ModuleShell = memo(function ModuleShell({
  state,
  onClose,
  children,
  onAction,
}: ModuleShellProps) {
  const [selectedItems, setSelectedItems] = useState<ReadonlySet<string>>(new Set());
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleToggle = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAction = useCallback(async (actionId: string) => {
    setProcessing(true);
    setActionStatus(null);
    try {
      let handled = false;
      if (onAction) {
        handled = await onAction(actionId, [...selectedItems]) === true;
      }
      if (!handled) {
        const result = await triggerModuleAction(
          state.moduleKey,
          actionId,
          [...selectedItems],
        );
        setActionStatus(result.message);
      }
    } catch (e) {
      setActionStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProcessing(false);
    }
  }, [state.moduleKey, selectedItems, onAction]);

  if (state.loading) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading module data...
      </div>
    );
  }

  return (
    <div className="py-3 flex flex-col gap-3">
      {/* State indicator */}
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1">{state.headline}</p>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={(STATE_KIND_STYLES[state.stateKind] ?? DEFAULT_STATE_STYLE) as any}
        >
          {state.stateKind.toUpperCase()}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {state.stats.map((stat) => {
          const trendIcon = stat.trend ? TREND_ICONS[stat.trend] ?? '' : '';
          const trendColor = stat.trend ? TREND_COLORS[stat.trend] ?? '#6b7280' : '#6b7280';
          return (
            <div key={stat.label} className="flex flex-col gap-0.5 rounded-lg border border-border/30 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <span className="text-sm font-bold text-foreground">
                {stat.value}
                {trendIcon && (
                  <span className="ml-1 text-xs" style={{ color: trendColor }}>
                    {trendIcon}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Custom module content (injected by each module) */}
      {children}

      {/* Items list */}
      <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
        {state.items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              'w-full text-left px-3 py-2.5 rounded-lg border transition-colors',
              selectedItems.has(item.id)
                ? 'border-primary/50 bg-primary/5'
                : 'border-border/30 hover:bg-accent/30',
            ].join(' ')}
            onClick={() => handleToggle(item.id)}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[item.status] }}
              />
              <span className="text-sm font-medium text-foreground truncate">
                {item.label}
              </span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.status}
              </span>
            </div>
            {item.detail && (
              <p className="text-xs text-muted-foreground mt-1 pl-4">
                {item.detail}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Action result feedback */}
      {actionStatus && (
        <div className="text-xs px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground border border-border/30">
          {actionStatus}
        </div>
      )}

      {/* Actions */}
      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {state.actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : 'default'}
            disabled={processing}
            onClick={() => handleAction(action.id)}
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action.label}
          </Button>
        ))}
      </DialogFooter>
    </div>
  );
});
