import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { IconConnect, IconTranslate, IconExecute } from '@/components/icons';

export function TriForcePage() {
  return (
    <Layout title="Tri-Force Protocol">
      <Section>
        <SectionHeader
          title="Tri-Force Protocol"
          subtitle="Connect, Translate, Execute"
        />

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            The Tri-Force Protocol is the foundational architecture powering every OmniHub workflow.
            It provides a three-pillar approach to enterprise integration that ensures seamless communication
            between disparate systems while maintaining reliability, observability, and control.
          </p>

          {/* The Three Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', marginTop: 'var(--space-12)' }}>

            {/* Connect */}
            <div className="card" style={{ padding: 'var(--space-8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-6)' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  flexShrink: 0,
                  borderRadius: 'var(--border-radius-md)',
                  background: 'radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.18), transparent 55%), radial-gradient(circle at 70% 70%, rgba(196, 87, 28, 0.14), transparent 55%), var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)'
                }}>
                  <IconConnect size={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="heading-3 mb-4">1. Connect</h3>
                  <p className="text-secondary mb-4">
                    <strong>Modular adapters plug into any system with an interface: API, webhook, or events.</strong>
                  </p>
                  <p className="text-secondary mb-4">
                    OmniHub's Connect layer uses a flexible adapter architecture that enables integration with virtually any platform.
                    Each adapter is standalone and modular, preventing cascading failures.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Enterprise Systems (CRMs, ERPs, ticketing, storage)
                    </li>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      AI Applications (model providers, agent frameworks, RAG pipelines)
                    </li>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Web3 Platforms (wallet operations, tokenization, proofs)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Translate */}
            <div className="card" style={{ padding: 'var(--space-8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-6)' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  flexShrink: 0,
                  borderRadius: 'var(--border-radius-md)',
                  background: 'radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.18), transparent 55%), radial-gradient(circle at 70% 70%, rgba(196, 87, 28, 0.14), transparent 55%), var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)'
                }}>
                  <IconTranslate size={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="heading-3 mb-4">2. Translate</h3>
                  <p className="text-secondary mb-4">
                    <strong>Canonical, typed semantic events so platforms actually understand each other.</strong>
                  </p>
                  <p className="text-secondary mb-4">
                    The Translation layer solves the fundamental problem of cross-platform communication by converting
                    all external events into a standardized, typed semantic format.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Unified event schema for all integrations
                    </li>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Type safety ensures data integrity
                    </li>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Events carry context and intent, not just raw data
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Execute */}
            <div className="card" style={{ padding: 'var(--space-8)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-6)' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  flexShrink: 0,
                  borderRadius: 'var(--border-radius-md)',
                  background: 'radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.18), transparent 55%), radial-gradient(circle at 70% 70%, rgba(196, 87, 28, 0.14), transparent 55%), var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)'
                }}>
                  <IconExecute size={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="heading-3 mb-4">3. Execute</h3>
                  <p className="text-secondary mb-4">
                    <strong>Deterministic workflows with receipts, retries, rollback paths, and MAN Mode gates.</strong>
                  </p>
                  <p className="text-secondary mb-4">
                    The Execution layer ensures that workflows run reliably, predictably, and safely with
                    built-in fault tolerance and human oversight.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Deterministic, repeatable execution paths
                    </li>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Cryptographic receipts for every operation
                    </li>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Automatic retry with intelligent backoff
                    </li>
                    <li className="text-secondary" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '2px' }}></span>
                      Compensation & rollback for multi-step workflows
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Use Cases</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-2">Cross-Platform Automation</h4>
                <p className="text-secondary text-sm">
                  Automate workflows that span multiple platforms (Salesforce → Slack → Jira) with zero custom integration code.
                </p>
              </div>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-2">AI Agent Orchestration</h4>
                <p className="text-secondary text-sm">
                  Connect AI agents to enterprise systems with semantic events that preserve context and intent.
                </p>
              </div>
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h4 className="heading-4 mb-2">Legacy System Modernization</h4>
                <p className="text-secondary text-sm">
                  Integrate legacy systems with modern platforms through adapters without modifying existing infrastructure.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Specs */}
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Technical Specifications</h2>
            <div className="card" style={{ padding: 'var(--space-6)', backgroundColor: 'var(--color-surface-elevated)' }}>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <li className="text-secondary" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>Event Processing</span>
                  <span>Up to 10,000 events/second per workflow</span>
                </li>
                <li className="text-secondary" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>Latency</span>
                  <span>Sub-100ms translation and routing (p95)</span>
                </li>
                <li className="text-secondary" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>Reliability</span>
                  <span>99.9% workflow completion rate</span>
                </li>
                <li className="text-secondary" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500 }}>Supported Protocols</span>
                  <span>REST, GraphQL, WebSocket, gRPC, MQTT, AMQP, Kafka</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'var(--space-16)', textAlign: 'center', padding: 'var(--space-12)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3 className="heading-3 mb-4">Ready to get started?</h3>
            <p className="text-secondary mb-8">
              Learn more about building with the Tri-Force Protocol in our technical documentation.
            </p>
            <a href="/tech-specs.html" className="btn btn--primary">
              View Technical Specs
            </a>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
