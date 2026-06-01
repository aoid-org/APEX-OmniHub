import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { StructuredData } from '@/components/StructuredData';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import storySchema from '../../../../public/schema/story.jsonld?raw';

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
    <blockquote className="relative my-12 -mx-4 px-8 py-8 bg-apex-surface border-l-[3px] border-l-apex-orange border-t border-t-apex-border border-b border-b-apex-border">
      <span className="absolute top-[-0.5rem] left-4 font-grotesk text-[4.5rem] leading-none text-apex-orange/[0.12] select-none pointer-events-none">
        &ldquo;
      </span>
      <p className="text-[clamp(1rem,2vw,1.18rem)] font-medium text-apex-text leading-[1.6] m-0 text-left indent-0">{children}</p>
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
    <div ref={containerRef} className="relative mt-16 px-6 py-12 border border-apex-border bg-apex-surface text-center overflow-hidden">
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

      <p className="relative z-10 text-apex-teal2 text-[0.95rem] font-medium mb-5 text-left-override">And turn chaos into orchestration.</p>
      <div className="relative z-10 w-9 h-px bg-apex-border mx-auto mb-4" aria-hidden="true" />
      <p className="relative z-10 font-mono text-[0.54rem] tracking-[0.18em] uppercase text-apex-muted">JR &mdash; Founder &amp; CTO, APEX Business Systems Ltd.</p>
    </div>
  );
});

const FounderStory = memo(function FounderStory() {
  const articleRef = useRef<HTMLElement>(null);
  const [articleVisible, setArticleVisible] = useState(false);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArticleVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.04 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Layout title="Founder's Story">
      <style>{`
        @keyframes storyFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes storyFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .story-hero-content {
          opacity: 0;
          animation: storyFadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s forwards;
        }
        .story-scroll-hint {
          opacity: 0;
          animation: storyFadeIn 0.8s ease 1.5s forwards;
        }
        .story-article-body {
          opacity: 0;
          animation: storyFadeUp 0.7s ease 0.1s forwards;
          animation-play-state: paused;
        }
        .story-article-body.visible {
          animation-play-state: running;
        }
        .story-p {
          text-align: justify;
          text-indent: 2em;
          hyphens: auto;
        }
        .text-left-override {
          text-indent: 0 !important;
          text-align: left !important;
        }
      `}</style>
      <SEOMeta
        title="The Founder's Story — Why APEX OmniHub Exists"
        description="Built from personal fragmentation, engineered for enterprise resilience. The story behind the platform that puts control back in your hands."
        canonical="https://apexomnihub.icu/story/"
        appendBrandSuffix={false}
      />
      <StructuredData id="story-schema" json={storySchema} />
      <ReadingProgress />

      {/* ═══ HERO ═══ */}
      <section
        className="relative min-h-screen flex flex-col justify-end overflow-hidden px-6 pb-20 pt-[calc(var(--nav-height,60px)+2rem)]"
        aria-labelledby="founder-story-title"
      >
        {/* Teal grid background */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(74,154,186,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(74,154,186,0.055)_1px,transparent_1px)] bg-[size:52px_52px]" aria-hidden="true" />

        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_70%_55%_at_10%_88%,rgba(212,98,31,0.13)_0%,transparent_55%),radial-gradient(ellipse_55%_60%_at_88%_12%,rgba(74,154,186,0.07)_0%,transparent_50%)]" aria-hidden="true" />

        <div className="story-hero-content relative z-[2] max-w-[860px]">
          {/* Eyebrow */}
          <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-apex-teal mb-5 flex items-center gap-4">
            <span className="block w-6 h-px bg-apex-teal" aria-hidden="true" />
            {'Founder\u2019s Story'}
          </p>

          {/* Pills */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <Pill label="Origin" variant="orange" />
            <Pill label="Personal Account" variant="outline" />
          </div>

          {/* Title */}
          <h1
            id="founder-story-title"
            className="font-grotesk font-bold leading-[1.05] tracking-[-0.025em] text-apex-text mb-6 text-[clamp(2.4rem,7vw,5rem)]"
          >
            Why I Built
            <br />
            <span className="text-apex-orange2">OmniHub</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[clamp(0.9rem,2vw,1.05rem)] text-apex-teal2 leading-[1.65] max-w-[520px] mb-9 font-normal">
            Turning chaos into orchestration. A personal account of fragmentation, resilience, and the system I had to build to survive.
          </p>

          {/* Tagline */}
          <p className="font-mono text-[0.62rem] tracking-[0.22em] uppercase text-apex-muted font-bold mb-[0.45rem]">
            Your Systems. Your Rules.
          </p>
          <p className="font-mono text-[0.58rem] tracking-[0.18em] uppercase text-apex-orange">
            Directable<span className="text-apex-muted mx-[0.4rem]">&bull;</span>Auditable<span className="text-apex-muted mx-[0.4rem]">&bull;</span>Reversible
          </p>

          {/* Meta */}
          <div className="flex items-center gap-6 mt-8 flex-wrap font-mono text-[0.54rem] tracking-[0.12em] uppercase text-apex-muted">
            <span>JR &mdash; Founder &amp; CTO</span>
            <div className="w-px h-3 bg-apex-border hidden sm:block" aria-hidden="true" />
            <span>APEX Business Systems Ltd.</span>
            <div className="w-px h-3 bg-apex-border hidden sm:block" aria-hidden="true" />
            <span>Edmonton, AB</span>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="story-scroll-hint absolute bottom-8 right-8 z-[2] flex-col items-center gap-2 hidden md:flex" aria-hidden="true">
          <div className="w-px h-11 bg-gradient-to-b from-apex-teal to-transparent animate-pulse" />
          <span className="font-mono text-[0.5rem] tracking-[0.22em] uppercase text-apex-muted [writing-mode:vertical-rl]">Read</span>
        </div>
      </section>

      {/* ═══ ARTICLE ═══ */}
      <div className="relative z-[2] max-w-[calc(700px+10rem)] mx-auto px-6 pt-16 pb-28 grid grid-cols-1 md:grid-cols-[1fr_700px_1fr]" id="main-content">
        <article
          ref={articleRef}
          className={cn('story-article-body md:col-start-2', articleVisible && 'visible')}
        >
          {/* Opening */}
          <p className="text-[clamp(1.05rem,2.5vw,1.22rem)] font-medium text-apex-text leading-[1.65] border-l-[3px] border-apex-orange pl-5 mb-9 text-left">
            I didn&apos;t set out to build an enterprise platform. I was trying to build a crutch.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            Not in the clich&eacute; way people use that word, but literally: something stable enough to lean on when life gets noisy, when attention gets split, when context collapses, when the world expects you to function like a machine while your brain is running a dozen tabs at once.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            At the time, I had lost more than momentum. I had lost stability. I had lost the version of life that looked predictable from the outside.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            So I built a system that didn&apos;t require predictability.
          </p>

          {/* ── Origin ── */}
          <SectionHead label="Origin" title="It Started as a Private Tool" highlight="Private Tool" />

          <p className="story-p text-base text-apex-text-dim mb-6">
            The earliest version wasn&apos;t called OmniHub. It was called Right Hand, because that&apos;s what I needed: something that could sit beside me and keep me aligned when everything else felt like drift.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            I was managing ADHD, running too many moving parts, and trying to keep multiple software projects alive at once. And the problem wasn&apos;t a lack of apps. The problem was fragmentation.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            Every tool demanded I switch context. Dashboards in one tab, analytics in another, messages somewhere else, telemetry buried behind login walls, tasks spread across systems that don&apos;t talk to each other.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            Each switch carried a cost. Not just time, but focus. And focus is expensive when you don&apos;t have a surplus of it.
          </p>

          <Callout variant="orange" label="The Rule That Started Everything" text="One interface. No context loss. Ever." />

          <p className="story-p text-base text-apex-text-dim mb-6">That rule became the seed.</p>

          {/* ── Realization ── */}
          <SectionHead label="The Realization" title="The Moment I Realized It Was Bigger Than Me" highlight="Bigger Than Me" />

          <p className="story-p text-base text-apex-text-dim mb-6">
            As I moved out of beginner environments and into real IDE workflows, I started using agents to accelerate development. And something unexpected happened.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            Every agent that touched the project reacted like it was a big deal. They used language like &ldquo;frontier innovation.&rdquo; They talked as if I had intentionally built something ahead of the curve.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            I didn&apos;t believe them.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            So I did something simple. I searched the world for what I had built. And I got back nothing. No clean matches, no obvious equivalents, no &ldquo;this is just another automation tool&rdquo; explanation that made it feel smaller.
          </p>

          <PullQuote>What I thought was a personal coping tool was actually a structural answer to a broader systems problem.</PullQuote>

          {/* ── Trust ── */}
          <SectionHead label="Core Problem" title="The Real Problem Isn't Automation. It's Trust." highlight="It's Trust." />

          <p className="story-p text-base text-apex-text-dim mb-6">
            Automation isn&apos;t new. Integrations aren&apos;t new. Even AI agents aren&apos;t new anymore. What&apos;s missing is governed execution, automation you can actually defend.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            Most systems fail in predictable ways. They behave differently in production than in testing. They retry without idempotency and double-run side effects. They work until a vendor changes something. They silently break and you only find out later. They generate outputs without receipts.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            I didn&apos;t want another system that usually works. I wanted a system that is directable, accountable, and dependable.
          </p>

          <Callout variant="teal" label="The Ethos" text="Intelligence Designed. Not AI magic, not &quot;trust me.&quot; Designed intelligence: structured, bounded, observable." />

          {/* ── Foundation ── */}
          <SectionHead label="Foundation" title="Building for Resilience Changes What You Build" highlight="What You Build" />

          <p className="story-p text-base text-apex-text-dim mb-6">
            Rock bottom isn&apos;t always the end. Sometimes it&apos;s bedrock.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            When you don&apos;t have safety nets, you stop building fragile things. You build systems that survive imperfect inputs, bad days, unstable environments, and adversarial conditions. That shaped OmniHub&apos;s core principles:
          </p>

          <ul className="list-none my-6 flex flex-col gap-3">
            {[
              ['Universal integration', 'vendor-agnostic by design'],
              ['Universal translation', 'because systems and humans don\u2019t think in one language'],
              ['Atomic idempotency', 'retries are always safe and deterministic'],
              ['Policy gates before execution', 'the system fails closed, not open'],
              ['Audit trails you can defend', 'receipts, not vibes'],
              ['One operational surface', 'no context loss'],
            ].map(([strong, rest]) => (
              <li key={strong} className="flex items-start gap-3 text-[0.94rem] text-[#96a8be] leading-relaxed">
                <span className="mt-[0.52rem] min-w-[6px] h-[6px] rounded-full bg-apex-orange flex-shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-apex-text font-semibold">{strong}</strong>
                  {' \u2014 '}
                  {rest}
                </span>
              </li>
            ))}
          </ul>

          <p className="story-p text-base text-apex-text-dim mb-6">
            And most importantly: structure is how you fix fragmentation.
          </p>

          {/* ── What It Became ── */}
          <SectionHead label="What It Became" title="A Control Plane for Everything" highlight="Control Plane" />

          <p className="story-p text-base text-apex-text-dim mb-6">
            OmniHub grew into a control plane. A single place where you can connect systems, translate intent, enforce policy, and produce an audit trail.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            Legacy systems, modern SaaS, AI tools, enterprise workflows, Web3 identity and verification when needed. Not because &ldquo;enterprise&rdquo; sounds impressive, but because fragmentation is expensive and chaos is everywhere.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            And because I have lived firsthand what happens when systems, personal or technical, don&apos;t hold under pressure. So OmniHub is built to hold.
          </p>

          {/* ── The Point ── */}
          <SectionHead label="The Point" title="A Lot of People Need This" highlight="Need This" />

          <p className="story-p text-base text-apex-text-dim mb-6">
            I&apos;m still a solo founder. I started building this because I needed it.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            But the deeper truth is, a lot of people need it. Not everyone calls it ADHD. Not everyone calls it chaos. But they all recognize the symptom: too many systems, too little structure, too much context loss.
          </p>

          <p className="story-p text-base text-apex-text-dim mb-6">
            OmniHub is my answer to that. Not as a pitch, but as a philosophy.
          </p>

          {/* ── Manifesto ── */}
          <Manifesto />

          {/* ── Footer CTA ── */}
          <div className="mt-12 flex flex-wrap gap-3">
            <Link to="/" className="font-mono text-[0.6rem] tracking-[0.16em] uppercase px-4 py-2 border border-apex-teal/30 text-apex-teal hover:bg-apex-teal/10 transition-colors rounded-[3px]">
              Explore Tech Specs
            </Link>
            <Link to="/auth" className="font-mono text-[0.6rem] tracking-[0.16em] uppercase px-4 py-2 border border-apex-orange/40 text-apex-orange2 hover:bg-apex-orange hover:text-white transition-colors rounded-[3px]">
              Launch Console
            </Link>
          </div>
        </article>
      </div>
    </Layout>
  );
});

export default FounderStory;
