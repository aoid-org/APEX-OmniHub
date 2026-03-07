/**
 * ModuleRenderer — Renders functional module content inside OmniModal.
 * Data-driven: reads from ModuleRegistry, zero hardcoded UI per module.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useState, useCallback } from 'react';
import { Button } from '../../../../../src/components/ui/button';
import { DialogFooter } from '../../../../../src/components/ui/dialog';
import {
  getModuleContent,
  type ModuleContent,
  type ModuleListItem,
  type ModuleStatItem,
} from './ModuleRegistry';

interface ModuleRendererProps {
  readonly moduleKey: string;
  readonly onAction: (payload: Record<string, unknown>) => void;
  readonly onClose: () => void;
}

const STATUS_COLORS: Readonly<Record<string, string>> = {
  active: '#34d399',
  inactive: '#6b7280',
  pending: '#facc15',
  error: '#ef4444',
};

function StatCard({ stat }: Readonly<{ stat: ModuleStatItem }>) {
  const trendIcon =
    stat.trend === 'up' ? '\u2191' :
    stat.trend === 'down' ? '\u2193' :
    stat.trend === 'stable' ? '\u2022' : '';

  const trendColor =
    stat.trend === 'up' ? '#34d399' :
    stat.trend === 'down' ? '#ef4444' : '#6b7280';

  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border/30 px-3 py-2">
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
}

function ItemRow({
  item,
  isSelected,
  onToggle,
}: Readonly<{
  item: ModuleListItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}>) {
  return (
    <button
      type="button"
      className={[
        'w-full text-left px-3 py-2.5 rounded-lg border transition-colors',
        isSelected
          ? 'border-primary/50 bg-primary/5'
          : 'border-border/30 hover:bg-accent/30',
      ].join(' ')}
      onClick={() => onToggle(item.id)}
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
}

function ModuleRendererInner({
  moduleKey,
  onAction,
  onClose,
}: ModuleRendererProps) {
  const content: ModuleContent | undefined = getModuleContent(moduleKey);
  const [selectedItems, setSelectedItems] = useState<ReadonlySet<string>>(
    new Set(),
  );

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

  if (!content) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Module data unavailable.
      </div>
    );
  }

  return (
    <div className="py-3 flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{content.headline}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {content.stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Items list */}
      <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
        {content.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            isSelected={selectedItems.has(item.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Actions */}
      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {content.actions.map((action) => (
          <Button
            key={action.id}
            variant={
              action.variant === 'destructive' ? 'destructive' : 'default'
            }
            onClick={() =>
              onAction({
                action: action.id,
                moduleKey,
                selectedItems: [...selectedItems],
              })
            }
          >
            {action.label}
          </Button>
        ))}
      </DialogFooter>
    </div>
  );
}

export const ModuleRenderer = memo(ModuleRendererInner);
