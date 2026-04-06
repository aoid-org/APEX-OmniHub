import { governance, reverse } from '@/components/home/MarketingHomeData';
import { PanelAudit, PanelPolicy, SplitSection } from '@/components/home/MarketingPanels';
import { HeroSection, TickerSection } from '@/components/home/MarketingHeroTicker';
import { CapabilitySection, ComplianceSection, CtaSection, MaestroSection } from '@/components/home/MarketingOtherSections';

export function MarketingHome() {
  return <div className="refresh-home"><HeroSection /><TickerSection /><SplitSection id="platform" eyebrow="Total Command" title="Absolute" accent="Governance." copy="You issue the directive. APEX OmniHub orchestrates every connected system with full visibility into every action, every agent, every outcome in real time." items={governance as any} panel={<PanelAudit />} /><SplitSection eyebrow="Architectural Primitive" title="Built to" accent="Reverse." copy="The only enterprise AI platform where rollback is a first-class architectural primitive. One bad decision does not cascade. You undo it completely." items={reverse as any} panel={<PanelPolicy />} reverse /><CapabilitySection /><MaestroSection /><ComplianceSection /><CtaSection /></div>;
}
