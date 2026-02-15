import { Layout, Section } from '@/components';

export function ManModePage() {
  // Verified clean for ESLint - Quality Gate pass
  return (
    <Layout title="M.A.N.Mode">
      <Section>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Header Section */}
          <div className="mb-12 text-center">
            <h1 className="heading-1 mb-4">M.A.N.Mode</h1>
            <p className="text-xl text-accent">Manual Authorization Needed</p>
          </div>

          {/* What It Is */}
          <div className="card mb-8 p-8 border-l-4 border-l-accent">
            <h3 className="heading-4 mb-2 uppercase text-sm tracking-wider opacity-70">What Is M.A.N.Mode?</h3>
            <p className="text-secondary leading-relaxed">
              Think of M.A.N.Mode as a smart pause button. When your automated workflows encounter a high-stakes 
              decision — like a large financial transaction or a sensitive security change — the system automatically 
              pauses that specific step and asks a human to review it before proceeding. Meanwhile, everything else 
              keeps running smoothly.
            </p>
          </div>

          {/* Core Principles */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="card p-6">
              <h3 className="heading-4 mb-4 uppercase text-sm tracking-wider opacity-70">How It Works</h3>
              <ul className="space-y-3 text-secondary text-sm">
                <li className="flex gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span><strong>Only pauses what matters</strong> — the rest of your workflow keeps running</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span><strong>Review on your time</strong> — approve from your phone, email, or dashboard</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span><strong>Complete paper trail</strong> — every decision is logged and auditable</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span><strong>Trust nothing, verify everything</strong> — built on zero-trust principles</span>
                </li>
              </ul>
            </div>
            
            <div className="card p-6">
              <h3 className="heading-4 mb-4 uppercase text-sm tracking-wider opacity-70">How You Get Notified</h3>
              <ul className="space-y-3 text-secondary text-sm">
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>Real-time dashboard alerts</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>Email notifications</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>Slack or Microsoft Teams messages</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-bold">→</span>
                  <span>SMS or PagerDuty for urgent items</span>
                </li>
              </ul>
            </div>
          </div>

          {/* How It Works - Visual Story */}
          <div className="mb-12">
            <h2 className="heading-2 mb-6">See It In Action</h2>
            <div className="card p-8" style={{ background: 'var(--color-surface-elevated)' }}>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-success)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'white', fontWeight: 'bold' }}>1</div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Workflow starts automatically</p>
                    <p className="text-sm text-secondary">A new customer onboarding workflow kicks off — records are created, data flows through the system.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-accent)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'white', fontWeight: 'bold' }}>2</div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>A sensitive step is detected</p>
                    <p className="text-sm text-secondary">The system flags an admin access request as high-risk. <strong>M.A.N.Mode activates</strong> — this step pauses and you're notified instantly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-info, #3b82f6)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'white', fontWeight: 'bold' }}>3</div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Everything else keeps moving</p>
                    <p className="text-sm text-secondary">The welcome email sends, other steps complete normally. Only the flagged step waits for your approval.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-navy)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'white', fontWeight: 'bold' }}>4</div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>You review and decide</p>
                    <p className="text-sm text-secondary">Approve, reject, or modify — right from your device. The workflow resumes instantly with your decision recorded.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What Gets Flagged */}
          <div className="mb-12">
            <h2 className="heading-2 mb-6">What Gets Flagged?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-5 border border-accent/30" style={{ borderColor: 'var(--color-accent)' }}>
                <div className="text-accent font-bold mb-2">💰 Financial Decisions</div>
                <p className="text-sm text-secondary">Large transactions, new vendor setups, payroll changes — anything that moves significant money.</p>
              </div>
              <div className="card p-5 border border-accent/30" style={{ borderColor: 'var(--color-accent)' }}>
                <div className="text-accent font-bold mb-2">🔒 Security Changes</div>
                <p className="text-sm text-secondary">Permission updates, access key rotations, public-facing configuration changes.</p>
              </div>
              <div className="card p-5 border border-accent/30" style={{ borderColor: 'var(--color-accent)' }}>
                <div className="text-accent font-bold mb-2">📊 Sensitive Data</div>
                <p className="text-sm text-secondary">Bulk data exports, personal information handling, database structure changes.</p>
              </div>
              <div className="card p-5 border border-accent/30" style={{ borderColor: 'var(--color-accent)' }}>
                <div className="text-accent font-bold mb-2">⚙️ Operations</div>
                <p className="text-sm text-secondary">Production deployments, infrastructure scaling, system-wide configuration changes.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center p-8 bg-surface border border-border rounded-lg">
            <h3 className="heading-3 mb-4">Directable. Accountable. Dependable.</h3>
            <p className="text-secondary mb-8 max-w-2xl mx-auto">
              M.A.N.Mode isn't just a feature — it's a safety philosophy. Your automation moves fast, 
              but the important decisions still go through you.
            </p>
            <div className="flex justify-center gap-4">
              <a href="/demo" className="btn btn--primary">See a Live Demo</a>
              <a href="/tech-specs" className="btn btn--secondary">Technical Details</a>
            </div>
          </div>

        </div>
      </Section>
    </Layout>
  );
}
