import { useEffect, useRef, type JSX } from 'react';

/* ================================================================
 * LaunchHero — Apple-grade responsive hero for OmniHub launch page
 * Mobile-first: 320px → 1920px | Purple #8B5CF6 + Gold #F59E0B
 * IMPLEMENT protocol: Tokens → Components → Screens → Effects
 * ================================================================ */

/** Respects user's prefers-reduced-motion setting. */
function useReducedMotion(): boolean {
  const mql =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  return mql?.matches ?? false;
}

/** Staggered fade-in via IntersectionObserver. */
function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) {
      if (el) el.style.opacity = '1';
      return;
    }

    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 500ms ease-out ${delay}ms, transform 500ms ease-out ${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, reducedMotion]);

  return ref;
}

/* --- Sub-components --- */

function HeroEyebrow(): JSX.Element {
  const ref = useFadeIn(0);
  return (
    <div ref={ref}>
      <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] text-launch-purple mb-4 lg:mb-6">
        Universal Synchronized Orchestrator
      </p>
    </div>
  );
}

function HeroHeadline(): JSX.Element {
  const ref = useFadeIn(100);
  return (
    <div ref={ref}>
      <h1
        id="launch-headline"
        className="text-[clamp(2.25rem,5vw+1rem,4.5rem)] font-black leading-[1.08] tracking-tight mb-5 lg:mb-7"
      >
        <span className="block">
          Connect{' '}
          <em className="not-italic bg-gradient-to-br from-launch-purple to-purple-400 bg-clip-text text-transparent">
            anything.
          </em>
        </span>
        <span className="block pl-2 sm:pl-6 lg:pl-10">
          Change{' '}
          <em className="not-italic bg-gradient-to-br from-launch-purple to-purple-400 bg-clip-text text-transparent">
            anything.
          </em>
        </span>
        <span className="block">
          Stay in{' '}
          <em className="not-italic bg-gradient-to-br from-launch-gold to-yellow-300 bg-clip-text text-transparent">
            control.
          </em>
        </span>
      </h1>
    </div>
  );
}

function HeroSubtitle(): JSX.Element {
  const ref = useFadeIn(250);
  return (
    <div ref={ref}>
      <p className="text-[clamp(0.9375rem,1.2vw,1.125rem)] text-muted-foreground max-w-[440px] mb-8 lg:mb-10">
        Your systems. Your rules. Intelligence designed. Freedom with structure.
      </p>
    </div>
  );
}

function HeroActions(): JSX.Element {
  const ref = useFadeIn(350);
  return (
    <div ref={ref} className="flex flex-col sm:flex-row gap-3">
      {/* Primary CTA */}
      <a
        href="/auth"
        role="button"
        aria-label="Launch the OmniHub console"
        className="inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7
                   bg-gradient-to-br from-launch-purple to-purple-700
                   text-white font-bold text-[0.9375rem] rounded-[14px]
                   shadow-[0_0_20px_rgba(139,92,246,0.35),0_8px_32px_rgba(0,0,0,0.4)]
                   hover:translate-y-[-2px] hover:scale-[1.02]
                   hover:shadow-[0_0_30px_rgba(139,92,246,0.45),0_12px_40px_rgba(0,0,0,0.5)]
                   active:translate-y-0 active:scale-[0.98]
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                   transition-all duration-200 ease-out"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Launch Console
      </a>

      {/* Outline CTA */}
      <button
        type="button"
        aria-label="Watch a demo of OmniHub"
        className="inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7
                   bg-transparent text-foreground font-bold text-[0.9375rem] rounded-[14px]
                   border border-launch-purple/20
                   hover:border-launch-purple hover:bg-launch-purple/[0.08] hover:translate-y-[-1px]
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                   transition-all duration-200 ease-out"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
        Watch Demo
      </button>
    </div>
  );
}

function SpecsCard(): JSX.Element {
  const ref = useFadeIn(200);
  const specs = [
    { label: 'Uptime', value: '99.97%' },
    { label: 'Latency', value: '<12ms' },
    { label: 'Integrations', value: '200+' },
    { label: 'Zero-Trust', value: 'Enforced' },
  ] as const;

  return (
    <div
      ref={ref}
      className="bg-launch-dark-card/65 border border-launch-purple/15 rounded-2xl p-7
                 backdrop-blur-xl"
    >
      <h2 className="text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-launch-purple mb-5 -rotate-2 origin-left">
        Tech Specs
      </h2>
      <dl className="grid grid-cols-2 gap-4">
        {specs.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[0.6875rem] uppercase tracking-widest text-muted-foreground">
              {label}
            </dt>
            <dd className="text-xl sm:text-[1.375rem] font-extrabold text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function VideoCard(): JSX.Element {
  const ref = useFadeIn(350);
  return (
    <div
      ref={ref}
      className="bg-launch-dark-card/65 border border-launch-purple/15 rounded-2xl overflow-hidden"
    >
      <button
        type="button"
        aria-label="Play 60-second product overview"
        className="flex flex-col items-center justify-center gap-3 w-full py-8 px-5
                   text-muted-foreground text-sm font-medium cursor-pointer
                   hover:text-foreground group
                   transition-colors duration-200"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-launch-purple opacity-70 group-hover:opacity-100 group-hover:scale-110
                     transition-all duration-200"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
        Watch the 60-second overview
      </button>
    </div>
  );
}

/* --- Main Component --- */

export const LaunchHero = (): JSX.Element => {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden
                 px-6 sm:px-10 lg:px-12 xl:px-16
                 pt-24 pb-12 lg:py-0"
      aria-labelledby="launch-headline"
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[60%] h-[70%]
                   bg-[radial-gradient(ellipse,rgba(139,92,246,0.35)_0%,transparent_70%)]
                   blur-[80px] pointer-events-none opacity-60"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[50%]
                   bg-[radial-gradient(ellipse,rgba(245,158,11,0.2)_0%,transparent_70%)]
                   blur-[80px] pointer-events-none opacity-50"
        aria-hidden="true"
      />

      {/* Grid BG */}
      <div
        className="absolute inset-0 pointer-events-none
                   [background-image:linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)]
                   [background-size:64px_64px]
                   [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_20%,transparent_80%)]"
        aria-hidden="true"
      />

      {/* Content Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-[65fr_35fr] lg:grid-cols-[3fr_2fr] gap-12 md:gap-10 lg:gap-[72px] xl:gap-24 max-w-[1280px] w-full mx-auto">
        {/* Left */}
        <div className="flex flex-col justify-center order-1">
          <HeroEyebrow />
          <HeroHeadline />
          <HeroSubtitle />
          <HeroActions />
        </div>

        {/* Right */}
        <aside
          className="flex flex-col gap-5 order-2 lg:justify-end lg:pb-[15vh]"
          aria-label="Platform specifications"
        >
          <SpecsCard />
          <VideoCard />
          <a
            href="/auth"
            role="button"
            aria-label="Launch Console — main call to action"
            className="inline-flex items-center justify-center w-full min-h-[52px] px-7
                       bg-gradient-to-br from-launch-purple to-purple-700
                       text-white font-bold text-[0.9375rem] rounded-[14px]
                       shadow-[0_0_20px_rgba(139,92,246,0.35),0_8px_32px_rgba(0,0,0,0.4)]
                       hover:translate-y-[-2px] hover:scale-[1.02]
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400
                       transition-all duration-200 ease-out uppercase tracking-wider"
          >
            LAUNCH CONSOLE
          </a>
        </aside>
      </div>
    </section>
  );
};

export default LaunchHero;
