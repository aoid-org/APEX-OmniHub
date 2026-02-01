import { Layout, Section, SectionHeader, BulletItem, BulletList } from '@/components';
import { siteConfig } from '@/content/site';

export function ManModePage() {
  return (
    <Layout title="MAN Mode">
      <Section>
        <SectionHeader title="MAN Mode" subtitle="Manual Authorization Needed" />

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>{siteConfig.manMode.description}</p>

          <div className="card" style={{ padding: 'var(--space-8)', backgroundColor: 'var(--color-orange)', color: 'var(--color-white)', marginBottom: 'var(--space-12)' }}>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.1em', marginBottom: 'var(--space-3)' }}>THE PHILOSOPHY</div>
            <p style={{ fontSize: 'var(--font-size-lg)', lineHeight: '1.75', margin: 0 }}>
              Automation accelerates business, but critical decisions require human judgment. MAN Mode gives you the best of both worlds.
            </p>
          </div>

          <div style={{ marginTop: 'var(--space-12)' }}>
            <h2 className="heading-2 mb-8">Key Features</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">High-Risk Items Are Flagged, Not Blocked</h4>
                <p className="text-secondary text-sm">
                  Traditional approval workflows stop everything when they encounter an item requiring approval.
                  MAN Mode is different: workflows continue execution while risky items are marked for review.
                  All other operations complete normally with no waiting for approval.
                </p>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Workflow Continues with Zero Interruption</h4>
                <p className="text-secondary text-sm">
                  The workflow engine intelligently routes around items in MAN Mode. Operations that don't depend
                  on flagged items proceed normally. Most operations complete successfully, delivering business value
                  immediately. Only high-risk items wait for approval.
                </p>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">User Notified for Manual Review</h4>
                <p className="text-secondary text-sm mb-4">Users are immediately notified through multiple channels when items require their attention:</p>
                <BulletList>
                  <BulletItem>In-app notifications with direct action links</BulletItem>
                  <BulletItem>Email alerts with item context</BulletItem>
                  <BulletItem>Slack/Teams integration</BulletItem>
                  <BulletItem>SMS for critical items</BulletItem>
                </BulletList>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Full Audit Trail Maintained</h4>
                <p className="text-secondary text-sm">
                  Every MAN Mode operation is completely logged: why it was flagged, when it was flagged,
                  who was notified, when it was reviewed, who approved/rejected, their rationale, and the final outcome.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Risk Categories</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>Financial</div>
                <p className="text-secondary text-sm">Large transactions, unusual patterns, new vendors</p>
              </div>
              <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>Security</div>
                <p className="text-secondary text-sm">Privileged access, data exports, config changes</p>
              </div>
              <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>Compliance</div>
                <p className="text-secondary text-sm">PII/PHI access, regulatory reporting</p>
              </div>
              <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>Operational</div>
                <p className="text-secondary text-sm">Production changes, service disruptions</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Example: Customer Onboarding</h2>
            <div className="card" style={{ padding: 'var(--space-8)', backgroundColor: 'var(--color-navy)', color: 'var(--color-white)' }}>
              <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-sm)' }}>
                <div style={{ marginBottom: 'var(--space-3)' }}><span style={{ opacity: 0.6 }}>Workflow: Customer Onboarding</span></div>
                <div style={{ paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div>├─ Create customer record <span style={{ color: '#4ade80' }}>✓ (completed)</span></div>
                  <div>├─ Setup billing account <span style={{ color: '#4ade80' }}>✓ (completed)</span></div>
                  <div>├─ Grant system access <span style={{ color: '#fb923c' }}>⚠ (MAN Mode - pending review)</span></div>
                  <div>├─ Send welcome email <span style={{ color: '#4ade80' }}>✓ (completed)</span></div>
                  <div>└─ Add to CRM <span style={{ color: '#4ade80' }}>✓ (completed)</span></div>
                </div>
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div><span style={{ opacity: 0.6 }}>Status:</span> 4/5 completed, 1 pending manual review</div>
                  <div><span style={{ opacity: 0.6 }}>Workflow:</span> NOT blocked</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-16)', textAlign: 'center', padding: 'var(--space-12)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3 className="heading-3 mb-4">Ready to balance automation with oversight?</h3>
            <p className="text-secondary mb-8">See how MAN Mode enables safe, fast workflows with human judgment where it matters.</p>
            <a href="/demo.html" className="btn btn--primary">See MAN Mode in Action</a>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
