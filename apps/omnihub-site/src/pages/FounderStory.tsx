import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type PillProps = Readonly<{
  label: string;
  variant: 'orange' | 'outline';
}>;

type SectionHeadProps = Readonly<{
  label: string;
  title: string;
  highlight?: string;
}>;

type CalloutProps = Readonly<{
  label: string;
  text: string;
  variant: 'orange' | 'teal';
}>;

const Pill = memo(function Pill({ label, variant }: PillProps) {
  return (
    <span
      className={cn(
        'font-mono text-[0.52rem] tracking-[0.15em] uppercase px-[0.85em] py-[0.28em] rounded-[3px]',
        variant === 'orange' && 'bg-apex-orange text-white',
        variant === 'outline' && 'border border-apex-teal/20 text-apex-teal',
      )}
    >
      {label}
    </span>
  );
});

const SectionHead = memo(function SectionHead({ label, title, highlight }: SectionHeadProps) {
  const parts = highlight ? title.split(highlight) : [title];

  return (
    <div className="mt-14 mb-7 pt-11 border-t border-apex-teal/10">
      <span className="font-mono text-[0.54rem] tracking-[0.26em] uppercase text-apex-teal mb-2 block">{label}</span>
      <h2 className="font-grotesk text-[clamp(1.35rem,3vw,2rem)] font-bold leading-[1.18] tracking-tight text-apex-text">
        {highlight ? (
          <>
            {parts[0]}
            <span className="text-apex-orange2">{highlight}</span>
            {parts[1]}
          </>
        ) : (
          title
        )}
      </h2>
    </div>
  );
});

const Callout = memo(function Callout({ label, text, variant }: CalloutProps) {
  return (
    <div
      className={cn(
        'my-9 px-6 py-5 rounded-[3px]',
        variant === 'orange' && 'bg-apex-orange/[0.08] border border-apex-orange/[0.22]',
        variant === 'teal' && 'bg-apex-teal/[0.07] border border-apex-teal/[0.2]',
      )}
    >
      <p
        className={cn(
          'font-mono text-[0.52rem] tracking-[0.22em] uppercase mb-2',
          variant === 'orange' ? 'text-apex-orange' : 'text-apex-teal',
        )}
      >
        {label}
      </p>
      <p className="text-base font-semibold text-apex-text leading-relaxed m-0 text-left indent-0">{text}</p>
    </div>
  );
});

const PullQuote = memo(function PullQuote({ children }: Readonly<{ children: string }>) {
  return (
    <blockquote className="relative my-12 -mx-4 px-8 py-8 bg-apex-surface border-l-[3px] border-apex-orange border-t border-b border-apex-border">
      <span className="absolute top-0 left-5 font-grotesk text-[5rem] leading-none text-apex-orange/10 select-none pointer-events-none">
        &ldquo;
      </span>
      <p className="text-[clamp(1rem,2vw,1.18rem)] font-medium text-apex-text leading-relaxed m-0 text-left indent-0">{children}</p>
    </blockquote>
  );
});

const ReadingProgress = memo(function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const pct = Math.min((doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100, 100);
      if (barRef.current) {
        barRef.current.style.width = `${pct}%`;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div ref={barRef} className="fixed top-0 left-0 h-[2px] w-0 z-[2000] rounded-r-sm bg-gradient-to-r from-apex-orange to-apex-teal" aria-hidden="true" />;
});

const Manifesto = memo(function Manifesto() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const lines = ['Design the intelligence.', 'Design the structure.', 'Design the trust.'];

  return (
    <div ref={containerRef} className="relative mt-16 px-6 py-14 border border-apex-border bg-apex-surface text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(212,98,31,0.08)_0%,transparent_65%)]" aria-hidden="true" />

      <div className="relative z-10 font-grotesk font-semibold leading-[2.1] mb-6 text-[clamp(1.1rem,2.5vw,1.65rem)]">
        {lines.map((line, i) => (
          <span
            key={line}
            className={cn(
              'block transition-all duration-500 ease-out',
              i === 0 && 'delay-0',
              i === 1 && '[transition-delay:260ms]',
              i === 2 && '[transition-delay:520ms]',
              i === 2 ? 'text-apex-orange2' : 'text-apex-text',
              active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[10px]',
            )}
          >
            {line}
          </span>
        ))}
      </div>

      <p className="relative z-10 text-apex-teal2 text-[0.95rem] font-medium mb-5">And turn chaos into orchestration.</p>
      <div className="relative z-10 w-9 h-px bg-apex-border mx-auto mb-4" aria-hidden="true" />
      <p className="relative z-10 font-mono text-[0.54rem] tracking-[0.18em] uppercase text-apex-muted">JR - Founder and CTO, APEX Business Systems Ltd.</p>
    </div>
  );
});

function useScrollReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('opacity-100', 'translate-y-0');
          obs.disconnect();
        }
      },
      { threshold: 0.04 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}

const FounderStory = memo(function FounderStory() {
  const articleRef = useScrollReveal();

  const paragraphs = {
    opening: [
      'I did not set out to build an enterprise platform. I was trying to build a crutch.',
      'Not in the cliche way people use that word, but literally: something stable enough to lean on when life gets noisy, when attention gets split, when context collapses, and when the world expects you to function like a machine while your brain is running a dozen tabs at once.',
      'At the time, I had lost more than momentum. I had lost stability. I had lost the version of life that looked predictable from the outside.',
      'So I built a system that did not require predictability.',
    ],
    origin: [
      'The earliest version was not called OmniHub. It was called Right Hand, because that is what I needed: something that could sit beside me and keep me aligned when everything else felt like drift.',
      'I was managing ADHD, running too many moving parts, and trying to keep multiple software projects alive at once. The problem was not a lack of apps. The problem was fragmentation.',
      'Every tool demanded a context switch. Dashboards in one tab, analytics in another, messages somewhere else, telemetry buried behind login walls, and tasks spread across systems that do not talk to each other.',
      'Each switch carried a cost. Not just time, but focus. Focus is expensive when you do not have a surplus of it.',
    ],
    realization: [
      'As I moved out of beginner environments and into full IDE workflows, I started using assistants to accelerate development. Something unexpected happened.',
      'Every reviewer that touched the project reacted as if it was a major breakthrough. They used language that made it clear the architecture had real depth and forward utility.',
      'I did not accept that at face value.',
      'So I searched globally for what I had built. I found no clean matches, no obvious equivalents, and no easy category that made it feel small.',
    ],
    trust: [
      'Automation is not new. Integrations are not new. Even agents are no longer new. What is missing is governed execution and automation you can defend.',
      'Most systems fail in predictable ways. They behave differently in production than in testing. They retry without idempotency and trigger duplicate side effects. They work until a vendor changes behavior. They break quietly, then fail loudly later. They emit outputs without receipts.',
      'I did not want another system that usually works. I wanted a system that is directable, accountable, and dependable.',
    ],
    foundation: [
      'Rock bottom is not always the end. Sometimes it is bedrock.',
      'When you do not have safety nets, you stop building fragile systems. You build for imperfect inputs, hard days, unstable environments, and adversarial conditions. That shaped OmniHub core principles:',
    ],
    became: [
      'OmniHub grew into a control plane. One place where teams connect systems, translate intent, enforce policy, and produce an auditable trail.',
      'Legacy systems, modern SaaS, enterprise workflows, and identity pathways when needed. Not because enterprise language sounds impressive, but because fragmentation is expensive and chaos is everywhere.',
      'I have lived what happens when systems, technical or personal, fail under pressure. OmniHub is built to hold under pressure.',
    ],
    point: [
      'I am still a solo founder. I started building this because I needed it.',
      'The deeper truth is that many people need it. Not everyone calls it ADHD. Not everyone calls it chaos. Everyone recognizes the symptom: too many systems, too little structure, and too much context loss.',
      'OmniHub is my answer to that, not as a pitch, but as an operating philosophy.',
    ],
  };

  return (
    <Layout title="Founder's Story">
      <ReadingProgress />

      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden px-6 pb-20 pt-[calc(60px+3rem)]" aria-labelledby="founder-story-title">
        <div className="absolute inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(74,154,186,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(74,154,186,0.055)_1px,transparent_1px)] bg-[size:52px_52px]" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_70%_55%_at_10%_88%,rgba(212,98,31,0.13)_0%,transparent_55%),radial-gradient(ellipse_55%_60%_at_88%_12%,rgba(74,154,186,0.07)_0%,transparent_50%)]" aria-hidden="true" />

        <div className="relative z-[2] max-w-[860px] animate-fadeUp mx-auto w-full">
          <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-apex-teal mb-5 flex items-center gap-4">
            <span className="block w-6 h-px bg-apex-teal" aria-hidden="true" />
            {' '}Founder&apos;s Story
          </p>

          <div className="flex gap-2 mb-5 flex-wrap">
            <Pill label="Origin" variant="orange" />
            <Pill label="Personal Account" variant="outline" />
          </div>

          <h1 id="founder-story-title" className="font-grotesk font-bold leading-[1.05] tracking-[-0.025em] text-apex-text mb-6 text-[clamp(2.4rem,7vw,5rem)]">
            Why I Built
            <br />
            <span className="text-apex-orange2">OmniHub</span>
          </h1>

          <p className="text-apex-teal2 leading-relaxed max-w-[520px] mb-9 text-[clamp(0.9rem,2vw,1.05rem)]">
            Turning chaos into orchestration. A personal account of fragmentation,
            resilience, and the system I had to build to survive.
          </p>

          <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-apex-muted font-bold mb-[0.45rem]">Your Systems. Your Rules.</p>
          <p className="font-mono text-[0.58rem] tracking-[0.18em] uppercase text-apex-orange">Directable<span className="text-apex-muted mx-1">&bull;</span>Auditable<span className="text-apex-muted mx-1">&bull;</span>Reversible</p>
        </div>
      </section>

      <main id="main-content" className="relative z-[2] max-w-[calc(700px+10rem)] mx-auto px-6 pt-16 pb-28 grid grid-cols-1 md:grid-cols-[1fr_700px_1fr]">
        <article ref={articleRef} className="md:col-start-2 opacity-0 translate-y-5 transition-all duration-700 ease-out">
          <p className="text-[clamp(1.05rem,2.5vw,1.22rem)] font-medium text-apex-text leading-relaxed border-l-[3px] border-apex-orange pl-5 mb-9 text-left indent-0">
            {paragraphs.opening[0]}
          </p>

          {paragraphs.opening.slice(1).map((text) => (
            <p key={text} className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">{text}</p>
          ))}

          <SectionHead label="Origin" title="It Started as a Private Tool" highlight="Private Tool" />
          {paragraphs.origin.map((text) => (
            <p key={text} className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">{text}</p>
          ))}

          <Callout variant="orange" label="The Rule That Started Everything" text="One interface. No context loss. Ever." />

          <p className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">That rule became the seed.</p>

          <SectionHead label="The Realization" title="The Moment I Realized It Was Bigger Than Me" highlight="Bigger Than Me" />
          {paragraphs.realization.map((text) => (
            <p key={text} className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">{text}</p>
          ))}

          <PullQuote>What I thought was a personal coping tool was actually a structural answer to a broader systems problem.</PullQuote>

          <SectionHead label="Core Problem" title="The Real Problem Is Not Automation. It Is Trust." highlight="It Is Trust." />
          {paragraphs.trust.map((text) => (
            <p key={text} className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">{text}</p>
          ))}

          <Callout variant="teal" label="The Ethos" text="Intelligence Designed. Not hype and not blind trust. Structured, bounded, observable intelligence." />

          <SectionHead label="Foundation" title="Building for Resilience Changes What You Build" highlight="What You Build" />
          {paragraphs.foundation.map((text) => (
            <p key={text} className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">{text}</p>
          ))}

          <ul className="list-none my-6 flex flex-col gap-3">
            {[
              ['Universal integration', 'vendor agnostic by design'],
              ['Universal translation', 'systems and humans do not think in one language'],
              ['Atomic idempotency', 'retries are safe and deterministic'],
              ['Policy gates before execution', 'the system fails closed, not open'],
              ['Audit trails you can defend', 'receipts, not guesses'],
              ['One operational surface', 'no context loss'],
            ].map(([strong, rest]) => (
              <li key={strong} className="flex items-start gap-3 text-[0.94rem] text-[#96a8be] leading-relaxed">
                <span className="mt-[0.52rem] min-w-[6px] h-[6px] rounded-full bg-apex-orange flex-shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-apex-text font-semibold">{strong}</strong>
                  {' - '}
                  {rest}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">And most importantly, structure is how you fix fragmentation.</p>

          <SectionHead label="What It Became" title="A Control Plane for Everything" highlight="Control Plane" />
          {paragraphs.became.map((text) => (
            <p key={text} className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">{text}</p>
          ))}

          <SectionHead label="The Point" title="A Lot of People Need This" highlight="Need This" />
          {paragraphs.point.map((text) => (
            <p key={text} className="text-base text-apex-text-dim mb-6 text-justify indent-8 hyphens-auto">{text}</p>
          ))}

          <Manifesto />

          <div className="mt-12 flex flex-wrap gap-3">
            <Link to="/tech-specs" className="font-mono text-[0.6rem] tracking-[0.16em] uppercase px-4 py-2 border border-apex-teal/30 text-apex-teal hover:bg-apex-teal/10 transition-colors">
              Explore Tech Specs
            </Link>
            <Link to="/auth" className="font-mono text-[0.6rem] tracking-[0.16em] uppercase px-4 py-2 border border-apex-orange/40 text-apex-orange2 hover:bg-apex-orange hover:text-white transition-colors">
              Launch Console
            </Link>
          </div>
        </article>
      </main>
    </Layout>
  );
});

export default FounderStory;
