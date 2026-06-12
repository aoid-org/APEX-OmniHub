/**
 * OmniMobileBottomNav — iOS-style fixed bottom tab bar
 *
 * Renders only on mobile/tablet viewports.
 * 5 tabs: Home, OmniSlate, Apps, Insights, More
 * ≥44×44px touch targets, env(safe-area-inset-bottom) aware.
 */
import type { Dispatch, SetStateAction, FC } from "react";

export type MobileTab = "home" | "slate" | "apps" | "insights" | "more";

interface OmniMobileBottomNavProps {
  readonly activeTab: MobileTab;
  readonly setActiveTab: Dispatch<SetStateAction<MobileTab>>;
  readonly isVisible?: boolean;
}

// ── SVG Icon Components ───────────────────────────────────────────────────────

const IconHome: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const IconSlate: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
    <circle cx="12" cy="10" r="1" fill="currentColor" />
    <circle cx="15" cy="10" r="1" fill="currentColor" />
  </svg>
);

const IconApps: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconInsights: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconMore: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="5" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="19" r="1.2" fill="currentColor" />
  </svg>
);

const TAB_ICONS: Record<MobileTab, FC> = {
  home: IconHome,
  slate: IconSlate,
  apps: IconApps,
  insights: IconInsights,
  more: IconMore,
};

const TABS: readonly { readonly id: MobileTab; readonly label: string }[] = [
  { id: "home",     label: "Home" },
  { id: "slate",    label: "Slate" },
  { id: "apps",     label: "Apps" },
  { id: "insights", label: "Insights" },
  { id: "more",     label: "More" },
];

export function OmniMobileBottomNav({ activeTab, setActiveTab, isVisible = true }: OmniMobileBottomNavProps) {
  return (
    <nav
      style={{ zIndex: 100 }}
      className={`fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-[#0A0D14]/95 backdrop-blur-md border-t border-white/5 pb-safe
        transform transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
    >
      <div className="flex items-center justify-around px-2 h-[68px]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = TAB_ICONS[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`omni-mobile-tab relative flex flex-col items-center justify-center w-16 h-full min-h-[44px] transition-colors ${
                isActive ? 'omni-mobile-tab--active text-brand-500' : 'text-slate-400 hover:text-slate-300'
              }`}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              type="button"
            >
              <span className="omni-mobile-tab__icon"><Icon /></span>
              <span className="omni-mobile-tab__label text-[10px] mt-1">{tab.label}</span>
              {isActive && <span className="omni-mobile-tab__indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
