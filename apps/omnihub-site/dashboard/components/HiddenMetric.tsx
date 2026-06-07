import React, { FC, memo } from 'react';
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
  valueClass?: string;
  className?: string;
}

export const HiddenMetric: FC<HiddenMetricProps> = memo(({
  icon: Icon,
  label,
  value,
  valueClass,
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
        <span className={cn('ml-2 tabular-nums', valueClass)}>{value}</span>
      </TooltipContent>
    </Tooltip>
  );
});

HiddenMetric.displayName = 'HiddenMetric';

const DefaultDotIcon = () => <span className="h-3.5 w-3.5 inline-block opacity-50">&bull;</span>;

export const HiddenValue = ({ icon: Icon, value, valueClass }: { icon?: React.ComponentType<{ className?: string }>, value: string | React.ReactNode, valueClass?: string }) => {
  const isDesktopHidden = false;
  const DefaultIcon = Icon || DefaultDotIcon;

  return (
    <div className="group relative inline-flex items-center justify-center min-w-[20px] h-5 cursor-default overflow-hidden">
      <div className={`absolute flex items-center transition-all duration-300 opacity-100 group-hover:opacity-0 group-hover:scale-50 ${isDesktopHidden ? '' : 'lg:opacity-0 lg:scale-50'}`}>
        <DefaultIcon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <span className={`transition-all duration-300 opacity-0 scale-95 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap ${isDesktopHidden ? '' : 'lg:opacity-100 lg:scale-100'} ${valueClass || ''}`}>
        {value}
      </span>
    </div>
  );
};
