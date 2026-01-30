import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { IconOrchestrator } from '@/components/icons';

export function OrchestratorPage() {
  return (
    <Layout title="Orchestrator">
      <Section>
        <SectionHeader
          title="The Orchestrator"
          subtitle="Central command for all workflows"
        />

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            The Orchestrator is the beating heart of APEX OmniHub. It serves as the central control plane
            that coordinates all integrations, manages workflow execution, and provides comprehensive observability
            across your entire operation.
          </p>

          {/* Core Capabilities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-8)', marginTop: 'var(--space-12)' }}>
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 className="heading-4 mb-3">Single Control Plane</h3>
              <p className="text-secondary text-sm mb-4">
                Unified interface for managing all integrations, workflows, and policies from one location.
                Eliminate integration silos and reduce operational complexity.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Centralized configuration
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Real-time visibility dashboard
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Global policy enforcement
                </li>
              </ul>
            </div>

            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 className="heading-4 mb-3">Real-Time Event Correlation</h3>
              <p className="text-secondary text-sm mb-4">
                Track and correlate every event from source to destination with unprecedented visibility
                into your operations.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Global correlation IDs
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Cross-system tracing
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Performance metrics tracking
                </li>
              </ul>
            </div>

            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 className="heading-4 mb-3">Automatic Retry & Compensation</h3>
              <p className="text-secondary text-sm mb-4">
                Intelligent failure handling with configurable retry policies and automatic compensation
                workflows ensures reliability.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Exponential backoff
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Circuit breaker patterns
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Saga pattern rollback
                </li>
              </ul>
            </div>

            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 className="heading-4 mb-3">State Persistence & Recovery</h3>
              <p className="text-secondary text-sm mb-4">
                Never lose progress with continuous checkpointing and automatic recovery from any failure point.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Continuous checkpointing
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Point-in-time recovery
                </li>
                <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.5em', width: '6px', height: '6px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
                  Automatic resumption
                </li>
              </ul>
            </div>
          </div>

          {/* Performance Stats */}
          <div style={{ marginTop: 'var(--space-16)' }}>
            <h2 className="heading-2 mb-8">Performance</h2>
            <div className="card" style={{ padding: 'var(--space-8)', backgroundColor: 'var(--color-navy)', color: 'var(--color-white)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-8)', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-orange)', marginBottom: 'var(--space-2)' }}>100K+</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255, 255, 255, 0.8)' }}>Events/second</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-orange)', marginBottom: 'var(--space-2)' }}>{'<10ms'}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255, 255, 255, 0.8)' }}>Orchestration overhead</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-orange)', marginBottom: 'var(--space-2)' }}>99.99%</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255, 255, 255, 0.8)' }}>Uptime SLA</div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'var(--space-16)', textAlign: 'center', padding: 'var(--space-12)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-lg)' }}>
            <h3 className="heading-3 mb-4">See the Orchestrator in action</h3>
            <p className="text-secondary mb-8">
              Watch how the Orchestrator coordinates complex multi-system workflows with ease.
            </p>
            <a href="/demo.html" className="btn btn--primary">
              Watch Demo
            </a>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
