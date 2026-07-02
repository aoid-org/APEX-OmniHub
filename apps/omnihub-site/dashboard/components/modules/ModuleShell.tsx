/**
 * ModuleShell — Shared layout for all dynamic module panels.
 * Renders stats, items, actions, and optional custom content.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { OmniModuleState } from '@/hooks/useOmniModuleState';
import { triggerModuleAction } from '@/hooks/useOmniModuleState';
import { getModuleActionCapability } from '../../contracts/moduleActionCapabilities';

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
  // PRCC-001 WP-3b: a module whose data loads but whose actions are all gated is
  // honestly a preview, not LIVE. Amber distinguishes it from live(green)/demo(purple).
  preview: {
    background: 'rgba(245,158,11,0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.3)',
  },
};

const DEFAULT_STATE_STYLE: StateStyle = {
  background: 'rgba(161,161,170,0.1)',
  color: '#a1a1aa',
  border: '1px solid rgba(161,161,170,0.3)',
};

/** Passed to function-form `children` so custom module content (e.g. a
 *  visualization that replaces the default item list) can drive the same
 *  selection state the default list and action buttons use. */
export interface ModuleShellSelectionContext {
  readonly selectedItems: ReadonlySet<string>;
  readonly toggle: (id: string) => void;
}

interface ModuleShellProps {
  readonly state: OmniModuleState;
  readonly onClose: () => void;
  readonly children?: React.ReactNode | ((ctx: ModuleShellSelectionContext) => React.ReactNode);
  readonly onAction?: (actionId: string, selectedItems: string[]) => Promise<boolean | string | void> | boolean | string | void;
  readonly getActionDisabledReason?: (actionId: string, selectedItems: readonly string[]) => string | null;
  readonly renderItem?: (item: OmniModuleState['items'][number], selected: boolean, toggle: () => void) => React.ReactNode;
}

export const ModuleShell = memo(function ModuleShell({
  state,
  onClose: _onClose,
  children,
  onAction,
  getActionDisabledReason,
  renderItem,
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
      const disabledReason = getActionDisabledReason?.(actionId, [...selectedItems]);
      if (disabledReason) {
        setActionStatus(disabledReason);
        return;
      }

      let handled = false;
      if (onAction) {
        const actionResult = await onAction(actionId, [...selectedItems]);
        if (typeof actionResult === 'string') {
          setActionStatus(actionResult);
          return;
        }
        handled = actionResult === true;
      }
      if (!handled) {
        const capability = getModuleActionCapability(state.moduleKey, actionId);
        if (!capability.supported) {
          // Module-specific copy — and we never call trigger-workflow for an
          // action we can't vouch for.
          setActionStatus(capability.copy);
          return;
        }

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
  }, [state.moduleKey, selectedItems, onAction, getActionDisabledReason]);

  if (state.loading) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading module data...
      </div>
    );
  }

  // PRCC-001 WP-3b/3c: honest render-time gating for the module action buttons.
  const gateReason = (actionId: string): string | null => {
    // Only the pure STUB case gates the button: a module that wires no onAction
    // handler AND whose action the capability map marks unsupported. Selection /
    // validation gates (getActionDisabledReason on modules that DO work, e.g.
    // "select one live automation") are intentionally left to click-time so their
    // inline messages still surface — we never disable a genuinely working button.
    if (!onAction) {
      const cap = getModuleActionCapability(state.moduleKey, actionId);
      if (!cap.supported) return cap.copy;
    }
    return null;
  };

  // Downgrade a "live" badge to PREVIEW when the module loaded but every action is
  // gated — the surface renders, nothing is actionable yet. Honest, and derived
  // from the same source as the button state so badge and buttons never disagree.
  const displayStateKind =
    state.stateKind === 'live' &&
    state.actions.length > 0 &&
    state.actions.every((a) => gateReason(a.id) !== null)
      ? 'preview'
      : state.stateKind;

  return (
    <div className="py-3 flex flex-col gap-3">
      {/* State indicator */}
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground flex-1">{state.headline}</p>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={STATE_KIND_STYLES[displayStateKind] ?? DEFAULT_STATE_STYLE}
        >
          {displayStateKind.toUpperCase()}
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
      {typeof children === 'function' ? children({ selectedItems, toggle: handleToggle }) : children}

      {/* Items list */}
      <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
        {state.items.map((item) => {
          const selected = selectedItems.has(item.id);
          const toggle = () => handleToggle(item.id);
          if (renderItem) {
            return <div key={item.id}>{renderItem(item, selected, toggle)}</div>;
          }
          return (
            <button
              key={item.id}
              type="button"
              className={[
                'w-full text-left px-3 py-2.5 rounded-lg border transition-colors',
                selected
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/30 hover:bg-accent/30',
              ].join(' ')}
              onClick={toggle}
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
          );
        })}
      </div>

      {/* Action result feedback */}
      {actionStatus && (
        <div className="text-xs px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground border border-border/30">
          {actionStatus}
        </div>
      )}

      {/* Actions — top-right X on the modal handles close; no bottom Close button */}
      {state.actions.length > 0 && (
        <DialogFooter className="gap-2 pt-2">
          {state.actions.map((action) => {
            const reason = gateReason(action.id);
            const gated = reason !== null;
            const variant = gated
              ? 'secondary'
              : action.variant === 'destructive'
                ? 'destructive'
                : 'default';
            return (
              <Button
                key={action.id}
                variant={variant}
                disabled={processing || gated}
                title={reason ?? undefined}
                aria-disabled={gated || undefined}
                onClick={() => handleAction(action.id)}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {action.label}
              </Button>
            );
          })}
        </DialogFooter>
      )}
    </div>
  );
});
