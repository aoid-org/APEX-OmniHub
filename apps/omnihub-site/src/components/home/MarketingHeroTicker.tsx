import { siteConfig } from '@/content/site';
import { MarketingOrbVisual } from '@/components/home/MarketingOrbVisual';
import { ticker } from '@/components/home/MarketingHomeData';

export function HeroSection() {
  return <section className="refresh-home__hero"><div className="refresh-home__hero-glow refresh-home__hero-glow--left" /><div className="refresh-home__hero-glow refresh-home__hero-glow--right" /><div className="container refresh-home__hero-grid"><div className="refresh-home__hero-copy"><h1 className="refresh-home__hero-title">The Universal<br/>Sync<br/>Orchestrator.</h1><p className="refresh-home__hero-subtext"><span className="refresh-home__hero-indent">The Anti-OS for enterprise AI.</span> Unify software, AI agents, and enterprise platforms into one governed command surface, where every action is authorized, logged, and reversible. Connect Web3, legacy, blockchain, physical AI, and enterprise systems without limits, constrained only by your capacity and use cases.</p><div className="refresh-home__pillars">{['DIRECT','AUDIT','DEDUCE'].map((x) => <span key={x} className="refresh-home__pillar">{x}</span>)}</div><div className="refresh-home__hero-actions"><a className="btn btn--primary btn--lg refresh-home__hero-button" href={siteConfig.ctas.primary.href}>Request Early Access</a><a className="btn btn--secondary btn--lg refresh-home__hero-button" href={siteConfig.ctas.secondary.href}>Watch Demo</a></div><p className="refresh-home__hero-trust"><span>SOC 2 Aligned</span><span aria-hidden="true">·</span><span>EU AI Act Art. 14</span><span aria-hidden="true">·</span><span>GDPR Art. 30</span><span aria-hidden="true">·</span><span>Trusted in regulated industries</span></p></div><div className="refresh-home__hero-visual"><MarketingOrbVisual /></div></div></section>;
}

export function TickerSection() {
  return <div className="refresh-home__ticker" aria-hidden="true"><div className="refresh-home__ticker-track">{[...ticker,...ticker].map((x,i) => <div key={`${x}-${i}`} className="refresh-home__ticker-item">{x}<span className="refresh-home__ticker-dot">·</span></div>)}</div></div>;
}
