import { useMemo } from 'react';
import { LayoutDashboard, Plug, Activity, Mic, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCapabilities, type Capabilities } from '@/hooks/useCapabilities';
import { useOmniModal } from '../stores/omniModalStore';
import type { OmniModalConfig } from '../stores/omniModalStore';

interface NavItem {
  moduleKey: string;
  label: string;
  icon: React.ElementType;
  capability?: keyof Capabilities;
}

const navItems: NavItem[] = [
  {
    moduleKey: 'dashboard',
    label: 'Dash',
    icon: LayoutDashboard,
    capability: 'canViewOmniDash',
  },
  {
    moduleKey: 'integrations',
    label: 'Connect',
    icon: Plug,
    capability: 'canManageIntegrations',
  },
  {
    moduleKey: 'omnitrace',
    label: 'Trace',
    icon: Activity,
    capability: 'canViewOmniTrace',
  },
  {
    moduleKey: 'agent',
    label: 'Agent',
    icon: Mic,
    capability: 'canUseVoiceAgent',
  },
  {
    moduleKey: 'settings',
    label: 'Settings',
    icon: Settings,
  },
];

/**
 * MobileBottomNav — Touch-friendly bottom navigation for mobile/tablet.
 * All items dispatch module modals within OmniDash.
 * No route navigation — single page app architecture.
 */
export function MobileBottomNav() {
  const { capabilities } = useCapabilities();
  const activeModuleKey = useOmniModal((s) => s.activeModal?.contextData?.moduleKey as string | undefined);

  // Filter items based on capabilities
  const visibleItems = useMemo(() => {
    return navItems.filter((item) => {
      if (!item.capability) return true;
      return capabilities[item.capability];
    });
  }, [capabilities]);

  const openModule = (moduleKey: string, title: string) => {
    const config: OmniModalConfig = {
      id: `mobile-${moduleKey}-${Date.now()}`,
      provider: 'OmniDash',
      type: 'module',
      title,
      description: `${title} module`,
      contextData: { moduleKey },
      onComplete: async () => { /* module handles its own actions */ },
    };
    useOmniModal.getState().invoke(config);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/40 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeModuleKey === item.moduleKey;

          return (
            <button
              key={item.moduleKey}
              type="button"
              onClick={() => openModule(item.moduleKey, item.label)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all',
                'min-w-[64px] touch-manipulation',
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              aria-label={item.label}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform',
                  active && 'scale-110'
                )}
              />
              <span className={cn(
                'text-[10px] font-medium transition-all',
                active && 'text-primary'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
