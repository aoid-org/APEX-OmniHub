import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { siteConfig } from '@/content/site';

export function FortressPage() {
  return (
    <Layout title="Fortress Protocol">
      <Section>
        <SectionHeader
          title="Fortress Protocol"
          subtitle="Zero-trust security by default"
        />

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            The Fortress Protocol is APEX OmniHub's comprehensive security framework built on zero-trust principles.
            Unlike traditional perimeter-based security, Fortress assumes breach by default and implements defense-in-depth
            at every layer. Security is not an afterthought—it is the foundation.
          </p>

          {/* Core Principles */}
          <div style={{ marginTop: 'var(--space-12)' }}>
            <h2 className="heading-2 mb-8">Core Principles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {siteConfig.fortress.items.map((item, idx) => (
                <div key={`fortress-item-${idx}-${item.slice(0, 30)}`} className="card" style={{ padding: 'var(--space-6)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    flexShrink: 0,
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: 'var(--color-navy)',
                    color: 'var(--color-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-bold)'
                  }}>
                    {idx + 1}
                  </div>
                  <p className="text-secondary" style={{ flex: 1, margin: '4px 0' }}>{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security Layers */}
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Security Layers</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Authentication</h4>
                <p className="text-secondary text-sm mb-4">
                  mTLS for all service communication, multi-factor authentication for users, API key management with rotation.
                </p>
              </div>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Authorization</h4>
                <p className="text-secondary text-sm mb-4">
                  RBAC and ABAC with context-aware policies. Dynamic evaluation of permissions based on risk and context.
                </p>
              </div>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Encryption</h4>
                <p className="text-secondary text-sm mb-4">
                  TLS 1.3 in transit, AES-256 at rest, end-to-end encryption for sensitive data with HSM-backed key storage.
                </p>
              </div>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Audit</h4>
                <p className="text-secondary text-sm mb-4">
                  Complete audit trail of all operations, immutable logs, cryptographic receipts, correlation IDs for tracking.
                </p>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Compliance & Certifications</h2>
            <div className="card" style={{ padding: 'var(--space-8)', backgroundColor: 'var(--color-surface)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-6)', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>SOC 2</div>
                  <div className="text-secondary text-sm">Type II</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>ISO 27001</div>
                  <div className="text-secondary text-sm">Certified</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>GDPR</div>
                  <div className="text-secondary text-sm">Compliant</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-2)' }}>HIPAA</div>
                  <div className="text-secondary text-sm">Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'var(--space-16)', textAlign: 'center', padding: 'var(--space-12)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3 className="heading-3 mb-4">Enterprise-grade security</h3>
            <p className="text-secondary mb-8">
              Learn more about our security practices and compliance certifications.
            </p>
            <a href="/tech-specs.html#security-posture" className="btn btn--primary">
              Security Documentation
            </a>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
