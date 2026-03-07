import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Distributed Tracing',
    description: 'Follow every request across all five APEX planes with correlated trace IDs. Gain full visibility into complex, multi-service interactions from origin to completion.',
    bulletPoints: [
      'Cross-plane trace correlation',
      'Automatic span propagation',
      'Waterfall visualization',
    ],
  },
  {
    title: 'Route Telemetry',
    description: 'Capture detailed telemetry for every route traversal, including latency breakdowns, throughput metrics, and path optimization insights.',
    bulletPoints: [
      'Per-route latency histograms',
      'Throughput and error-rate tracking',
      'Hot-path identification',
    ],
  },
  {
    title: 'Render Diagnostics',
    description: 'Monitor front-end render performance with frame-level diagnostics. Identify slow components, layout shifts, and interaction bottlenecks in real time.',
    bulletPoints: [
      'Component-level profiling',
      'Core Web Vitals tracking',
      'Layout shift detection',
    ],
  },
  {
    title: 'Performance Profiling',
    description: 'Deep-dive into CPU, memory, and I/O profiles for any service or workflow. Pinpoint resource contention and optimize allocation automatically.',
    bulletPoints: [
      'CPU flame graphs',
      'Memory allocation tracking',
      'I/O saturation alerts',
    ],
  },
];

const performanceStats = [
  { value: '<5ms', label: 'Trace overhead' },
  { value: '100%', label: 'Request coverage' },
  { value: '30-day', label: 'Retention' },
];

export function OmniTracePage() {
  return (
    <Layout title="OmniTrace">
      <Section>
        <SectionHeader
          title="OmniTrace"
          subtitle="Unified tracing, route telemetry, and render diagnostics"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            OmniTrace delivers end-to-end observability across every layer of APEX OmniHub. With distributed
            tracing spanning all five planes, route-level telemetry, and real-time render diagnostics, you
            gain complete visibility into system behavior from ingestion to presentation.
          </p>

          {/* Core Capabilities */}
          <div className="feature-detail-grid">
            {capabilities.map((capability) => (
              <InfoCard key={capability.title} {...capability} />
            ))}
          </div>

          {/* Performance Stats */}
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Performance</h2>
            <div className="card" style={{ padding: 'var(--space-8)', backgroundColor: 'var(--color-navy)', color: 'var(--color-white)' }}>
              <StatsGrid stats={performanceStats} />
            </div>
          </div>

          {/* CTA */}
          <CTASection
            title="See OmniTrace in action"
            description="Explore how OmniTrace provides full-stack observability with minimal overhead."
            buttonText="Explore OmniTrace"
            buttonHref="/demo"
          />
        </div>
      </Section>
    </Layout>
  );
}
