import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const HiddenMetric = ({ icon: Icon, label, value, valueClass }: { icon: React.ElementType, label: string, value: string | React.ReactNode, valueClass?: string }) => {
  const testIdKey = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            data-testid={`telemetry-${testIdKey}`}
            aria-label={`${label}: ${value}`}
            tabIndex={0}
          >
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-200" />
            <span className="sr-only">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2 px-3 py-2 bg-[#120D1A]/95 border-purple-900/50 backdrop-blur-md" data-testid={`telemetry-tooltip-${testIdKey}`}>
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
          <span className={`font-mono text-sm ${valueClass || 'text-gray-100 font-medium'}`}>
            {value}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const HiddenValue = ({ icon: Icon, value, valueClass, label }: { icon?: React.ElementType, value: string | React.ReactNode, valueClass?: string, label?: string }) => {
  const DefaultIcon = Icon || (() => <span className="h-5 w-5 inline-flex items-center justify-center opacity-50 text-xl leading-none">•</span>);
  const testIdKey = typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, '-') : 'val';
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="group flex items-center justify-center p-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            data-testid={`telemetry-${testIdKey}`}
            aria-label={`${label || 'Value'}: ${value}`}
            tabIndex={0}
          >
            <DefaultIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2 px-3 py-2 bg-[#120D1A]/95 border-purple-900/50 backdrop-blur-md" data-testid={`telemetry-tooltip-${testIdKey}`}>
          {label && <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</span>}
          <span className={`font-mono text-sm ${valueClass || 'text-gray-100 font-medium'}`}>
            {value}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
