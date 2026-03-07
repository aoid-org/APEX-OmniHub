import { NavLink } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { LucideIcon } from 'lucide-react';

interface OmniDashNavIconButtonProps {
  to: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

/**
 * OmniDash Navigation Icon Button
 *
 * Apple-grade visual design:
 * - Clear lucide-react icons (not letters)
 * - High contrast for readability
 * - Smooth transitions and focus states
 * - Keyboard shortcut hints in tooltips
 * - Accessible (ARIA labels, keyboard navigation)
 */
export const OmniDashNavIconButton = ({ to, label, icon: Icon, shortcut }: OmniDashNavIconButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          data-testid={`omnidash-nav-${label.toLowerCase().replaceAll(/\s/g, '-')}`}
          aria-label={shortcut ? `${label} (Shortcut: ${shortcut})` : label}
          className={({ isActive }) =>
            `
            flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg
            text-sm font-medium transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }
          `.trim().replaceAll(/\s+/g, ' ')
          }
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
          <span className="text-xs font-medium hidden md:block">{label}</span>
          <span className="sr-only md:not-sr-only">{label}</span>
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="flex flex-col gap-1">
          <p className="font-medium">{label}</p>
          {shortcut && (
            <p className="text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">{shortcut}</kbd>
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};