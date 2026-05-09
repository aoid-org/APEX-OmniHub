export function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      {/* Concentric orbital rings */}
      <div className="hero-visual__rings" />

      {/* Center hub / glowing core */}
      <div className="hero-visual__hub">
        {/* Core highlight reflection and sphere styling managed by CSS */}
        <div className="hero-visual__hub-core flex items-center justify-center">
          <img 
            src="/apex-badge.svg" 
            alt="APEX Core Badge" 
            className="w-[160%] h-[160%] object-contain relative z-20 mix-blend-screen"
            style={{ filter: 'drop-shadow(0 0 40px rgba(14, 165, 233, 0.9))' }}
          />
          <div className="hero-visual__hub-eye mix-blend-overlay"></div>
        </div>
      </div>

      {/* Orbiting technology concepts */}
      <div className="hero-visual__orbit hero-visual__orbit--1">
        {/* Inner orbit: Web3 */}
        <div className="hero-visual__icon hero-visual__icon--a hover-lift">
          <div className="hero-visual__icon-inner">
            <span className="sr-only">Web3</span>
          </div>
          <span className="text-xs font-mono text-cyan-400 absolute -top-8 left-1/2 -translate-x-1/2 tracking-wider whitespace-nowrap font-bold drop-shadow-md">WEB3</span>
        </div>
        
        {/* Inner orbit: AI Cloud */}
        <div className="hero-visual__icon hero-visual__icon--b hover-lift">
          <div className="hero-visual__icon-inner">
            <span className="sr-only">AI Cloud</span>
          </div>
          <span className="text-xs font-mono text-fuchsia-400 absolute -top-8 left-1/2 -translate-x-1/2 tracking-wider whitespace-nowrap font-bold drop-shadow-md">AI CLOUD</span>
        </div>
        
        {/* Inner orbit: Enterprise */}
        <div className="hero-visual__icon hero-visual__icon--c hover-lift">
          <div className="hero-visual__icon-inner">
            <span className="sr-only">Enterprise</span>
          </div>
          <span className="text-xs font-mono text-orange-400 absolute -top-8 left-1/2 -translate-x-1/2 tracking-wider whitespace-nowrap font-bold drop-shadow-md">ENTERPRISE</span>
        </div>
        
        {/* Inner orbit: Physical AI */}
        <div className="hero-visual__icon hero-visual__icon--d hover-lift">
          <div className="hero-visual__icon-inner">
            <span className="sr-only">Physical AI</span>
          </div>
          <span className="text-xs font-mono text-cyan-400 absolute -top-8 left-1/2 -translate-x-1/2 tracking-wider whitespace-nowrap font-bold drop-shadow-md">PHYSICAL AI</span>
        </div>
        
        {/* Inner orbit: Legacy */}
        <div className="hero-visual__icon hero-visual__icon--e hover-lift">
          <div className="hero-visual__icon-inner">
            <span className="sr-only">Legacy</span>
          </div>
          <span className="text-xs font-mono text-green-400 absolute -top-8 left-1/2 -translate-x-1/2 tracking-wider whitespace-nowrap font-bold drop-shadow-md">LEGACY</span>
        </div>
      </div>
    </div>
  );
}
