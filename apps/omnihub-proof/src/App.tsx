// JR_ACTION: Replace this URL with the final Calendly link before launch.
const CALENDLY_URL = 'https://calendly.com/apex-jr-REPLACE'
// JR_ACTION: Replace with the final contact email before launch.
const CONTACT_EMAIL = 'jr@apexbiz.ca-REPLACE'

const proofStats = [
  { stat: '93,000+', label: 'Lines of Production Code' },
  { stat: '3,120', label: 'Automated Tests' },
  { stat: '26', label: 'Release Gates Tracked' },
  { stat: 'Evidence', label: 'Security · Reliability · Maintainability Signals' },
]

const tags = ['Cloudflare Workers', 'Supabase', 'Stripe', 'PWA', 'Operational Evidence']

function OrchestrateIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M25.5 13.5A9.75 9.75 0 0 0 7.75 8.75" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 5.5v5h5" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 18.5a9.75 9.75 0 0 0 17.75 4.75" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25.5 26.5v-5h-5" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16 4.5 25 8v7.25c0 5.75-3.75 10.75-9 12.25-5.25-1.5-9-6.5-9-12.25V8l9-3.5Z" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12 16 2.75 2.75L20.5 13" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16 27.5c6.351 0 11.5-5.149 11.5-11.5S22.351 4.5 16 4.5 4.5 9.649 4.5 16 9.649 27.5 16 27.5Z" stroke="#C9A84C" strokeWidth="2" />
      <path d="m10.75 16.25 3.5 3.5 7-7.5" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-bg text-white">
      <nav className="sticky top-0 z-50 h-14 border-b border-gold-dim bg-bg">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <a href="#top" className="text-lg" aria-label="APEX OmniHub home">
            <span className="font-bold text-gold">APEX</span>{' '}
            <span className="font-normal text-white">OmniHub</span>
          </a>
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="rounded bg-gold px-5 py-2 text-sm font-semibold text-bg hover:opacity-90">
            Book a Call
          </a>
        </div>
      </nav>

      <main id="top">
        <section className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-dim px-4 py-1.5 text-xs text-gold">
            <span>Intelligence Designed</span>
            <span aria-hidden="true">·</span>
            <span>Cloudflare Native</span>
            <span aria-hidden="true">·</span>
            <span>Release Evidence</span>
          </div>
          <h1 className="mt-8 text-5xl font-bold leading-tight md:text-7xl">
            <span className="block">Connect anything.</span>
            <span className="block">Orchestrate everything.</span>
            <span className="block text-gold">Stay in control.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            OmniHub is the governed automation control plane for teams who need auditability, resilience, and deterministic execution — not another point solution.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="rounded bg-gold px-8 py-3.5 text-base font-semibold text-bg hover:opacity-90">
              Book a Discovery Call
            </a>
            <a href="#proof" className="rounded border border-gold-dim px-8 py-3.5 text-base text-gold transition hover:bg-gold-dim">
              See How It Works
            </a>
          </div>
        </section>

        <section id="proof" className="border-y border-gold-dim px-6 py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 text-center md:grid-cols-4">
            {proofStats.map(({ stat, label }) => (
              <div key={label}>
                <div className="text-4xl font-bold text-gold">{stat}</div>
                <div className="mt-2 text-sm text-muted">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="mb-4 text-xs uppercase tracking-widest text-gold">What OmniHub Does</p>
          <h2 className="mb-16 text-3xl font-bold md:text-4xl">Designed to orchestrate. Built to prove it.</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <article className="rounded-lg border border-gold-dim bg-card p-8 transition-colors duration-200 hover:border-gold">
              <OrchestrateIcon />
              <h3 className="mt-6 text-2xl font-bold">Orchestrate</h3>
              <p className="mt-4 text-muted">
                OmniRoute dispatches every action to the right handler. Connect any tool, API, or data source. No spaghetti. No drift.
              </p>
            </article>
            <article className="rounded-lg border border-gold-dim bg-card p-8 transition-colors duration-200 hover:border-gold">
              <ShieldIcon />
              <h3 className="mt-6 text-2xl font-bold">Govern</h3>
              <p className="mt-4 text-muted">
                Guardian PDP enforces policy on every decision. Veritas provides fail-closed audit trails. Your agents stay inside the lines.
              </p>
            </article>
            <article className="rounded-lg border border-gold-dim bg-card p-8 transition-colors duration-200 hover:border-gold">
              <CheckCircleIcon />
              <h3 className="mt-6 text-2xl font-bold">Prove</h3>
              <p className="mt-4 text-muted">
                Release evidence is tracked through CI, security, reliability, and maintainability checks so delivery decisions stay auditable by design.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="text-xs uppercase tracking-widest text-gold">Live Deployment</p>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">Operational proof under review.</h2>
          <p className="mx-auto mb-12 mt-4 max-w-2xl text-muted">A focused proof package for reviewing deployment, payments, entitlement, and operational-readiness evidence.</p>
          <article className="rounded-lg border border-gold bg-card p-10 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-bold">SBBL HQ</h3>
              <span className="rounded-full bg-gold-dim px-3 py-1 text-xs text-gold">Evidence Review</span>
            </div>
            <p className="mt-4 leading-relaxed text-muted">
              Basketball operations reference architecture covering league management, PPV payments, broadcast access control, replay entitlement, Stripe checkout, and Supabase-backed player workflows on Cloudflare Workers.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded border border-gold-dim bg-bg px-3 py-1 text-xs text-muted">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="border-t border-gold-dim px-6 py-32 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold md:text-4xl">Ready to see what Intelligence Designed looks like in your stack?</h2>
          <p className="mb-10 mt-4 text-lg text-muted">Book a 30-minute discovery call. No pitch deck. Just a real conversation about your systems.</p>
          <a href={CALENDLY_URL} target="_blank" rel="noreferrer" className="rounded bg-gold px-12 py-4 text-lg font-bold text-bg transition hover:opacity-90">
            Book a Discovery Call
          </a>
          <p className="mt-6 text-sm text-muted">
            or email <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold underline">{CONTACT_EMAIL}</a>
          </p>
          <footer className="mt-20 text-xs text-muted">
            <p>© 2026 APEX Business Systems Ltd. · Edmonton, Alberta, Canada</p>
            <p className="mt-2">Powered by Cloudflare · Built with Intelligence Designed methodology</p>
          </footer>
        </section>
      </main>
    </div>
  )
}

export default App
