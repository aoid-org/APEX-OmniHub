import { FC, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import type { LucideIcon } from 'lucide-react';

interface HiddenMetricProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
}

export const HiddenMetric: FC<HiddenMetricProps> = memo(({
  icon: Icon,
  label,
  value,
  className,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger
        data-testid={`telemetry-trigger-${label}`}
        className={cn('inline-flex items-center justify-center rounded-md p-2', className)}
        aria-label={label}
      >
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent data-testid={`telemetry-tooltip-${label}`}>
        <span className="font-medium">{label}</span>
        <span className="ml-2 tabular-nums">{value}</span>
      </TooltipContent>
    </Tooltip>
  );
});

HiddenMetric.displayName = 'HiddenMetric';
