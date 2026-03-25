/**
 * OmniMobileBottomNav — iOS-style fixed bottom tab bar
 *
 * Renders only on mobile/tablet viewports.
 * 5 tabs: Home, OmniSlate, Apps, Insights, More
 * ≥44×44px touch targets, env(safe-area-inset-bottom) aware.
 */
import type { Dispatch, SetStateAction } from "react";

export type MobileTab = "home" | "slate" | "apps" | "insights" | "more";

interface OmniMobileBottomNavProps {
  readonly activeTab: MobileTab;
  readonly setActiveTab: Dispatch<SetStateAction<MobileTab>>;
}

const TABS: readonly { readonly id: MobileTab; readonly label: string; readonly icon: string }[] = [
  { id: "home",     label: "Home",     icon: "⌂" },
  { id: "slate",    label: "Slate",    icon: "◆" },
  { id: "apps",     label: "Apps",     icon: "⊞" },
  { id: "insights", label: "Insights", icon: "◎" },
  { id: "more",     label: "More",     icon: "≡" },
];

export function OmniMobileBottomNav({ activeTab, setActiveTab }: OmniMobileBottomNavProps) {
  return (
    <div
      className="omni-mobile-bottom-nav"
      role="tablist"
      aria-label="Dashboard navigation"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            className={`omni-mobile-tab${isActive ? " omni-mobile-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span className="omni-mobile-tab__icon">{tab.icon}</span>
            <span className="omni-mobile-tab__label">{tab.label}</span>
            {isActive && <span className="omni-mobile-tab__indicator" />}
          </button>
        );
      })}
    </div>
  );
}
