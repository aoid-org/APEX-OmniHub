import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';

export function OmniPortPage() {
  return (
    <Layout title="OmniPort">
      <Section>
        <SectionHeader
          title="OmniPort"
          subtitle="Single ingress/egress gateway for simplified security and total observability"
        />

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            OmniPort is APEX OmniHub's unified gateway that consolidates all external communication through a single,
            controlled access point. This single-port architecture dramatically simplifies security configuration,
            reduces attack surface, and enables comprehensive monitoring of all data in transit.
          </p>

          {/* Value Proposition */}
          <div className="card" style={{ padding: 'var(--space-8)', backgroundColor: 'var(--color-orange)', color: 'var(--color-white)', marginBottom: 'var(--space-12)' }}>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.1em', marginBottom: 'var(--space-3)' }}>ONE PORT. TOTAL CONTROL.</div>
            <p style={{ fontSize: 'var(--font-size-lg)', lineHeight: '1.75', margin: 0 }}>
              Instead of managing dozens of firewall rules and network policies, OmniPort channels all
              traffic through one gateway—simplifying security while providing complete visibility.
            </p>
          </div>

          {/* Core Benefits */}
          <div style={{ marginTop: 'var(--space-12)' }}>
            <h2 className="heading-2 mb-8">Core Benefits</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Simplified Security Configuration</h4>
                <p className="text-secondary text-sm mb-4">
                  Traditional architectures require complex firewall rules for each integration. OmniPort reduces
                  this to a single ingress/egress point.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    One port to configure in firewalls
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Centralized TLS termination
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Unified authentication point
                  </li>
                </ul>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Reduced Attack Surface</h4>
                <p className="text-secondary text-sm mb-4">
                  By consolidating all external communication through a single gateway, you minimize the number
                  of potential entry points for attackers.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Single point to harden and monitor
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Easier to implement DDoS protection
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Simplified intrusion detection
                  </li>
                </ul>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Total Observability</h4>
                <p className="text-secondary text-sm mb-4">
                  All traffic flows through OmniPort, giving you complete visibility into every request and response
                  entering or leaving your system.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Comprehensive audit logging
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Real-time traffic analytics
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Anomaly detection and alerting
                  </li>
                </ul>
              </div>

              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-3">Built-in Rate Limiting</h4>
                <p className="text-secondary text-sm mb-4">
                  OmniPort includes intelligent rate limiting and throttling to protect your systems from abuse
                  and ensure fair resource allocation.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Per-client rate limits
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Dynamic throttling based on load
                  </li>
                  <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                    Priority queues for critical traffic
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Technical Features */}
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Technical Features</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-6)' }}>
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>Protocol Agnostic</div>
                <p className="text-secondary text-sm">HTTP, gRPC, WebSocket, MQTT—all protocols supported through unified envelope format</p>
              </div>
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>Auto TLS</div>
                <p className="text-secondary text-sm">Automatic TLS termination and certificate management with Let's Encrypt integration</p>
              </div>
              <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }}>High Performance</div>
                <p className="text-secondary text-sm">Sub-millisecond routing latency with horizontal scaling for unlimited throughput</p>
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Traditional vs OmniPort Architecture</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
              <div>
                <h4 className="heading-4 mb-4" style={{ color: 'var(--color-text-muted)' }}>Traditional Approach</h4>
                <div className="card" style={{ padding: 'var(--space-6)', backgroundColor: 'var(--color-surface)' }}>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <li className="text-secondary text-sm">✗ Dozens of firewall rules</li>
                    <li className="text-secondary text-sm">✗ Multiple security policies</li>
                    <li className="text-secondary text-sm">✗ Scattered monitoring</li>
                    <li className="text-secondary text-sm">✗ Complex configuration</li>
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="heading-4 mb-4" style={{ color: 'var(--color-accent)' }}>OmniPort Approach</h4>
                <div className="card" style={{ padding: 'var(--space-6)', borderColor: 'var(--color-accent)' }}>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <li className="text-secondary text-sm">✓ Single port configuration</li>
                    <li className="text-secondary text-sm">✓ Unified security policy</li>
                    <li className="text-secondary text-sm">✓ Centralized observability</li>
                    <li className="text-secondary text-sm">✓ Simple setup</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'var(--space-16)', textAlign: 'center', padding: 'var(--space-12)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3 className="heading-3 mb-4">Simplify your security architecture</h3>
            <p className="text-secondary mb-8">
              Learn how OmniPort can reduce complexity while increasing visibility and control.
            </p>
            <a href="/tech-specs.html#single-port" className="btn btn--primary">
              Technical Documentation
            </a>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
