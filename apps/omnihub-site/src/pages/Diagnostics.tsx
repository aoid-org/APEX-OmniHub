import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Log Aggregation',
    description: 'Centralized log collection from every service, container, and edge node. Search, filter, and correlate logs across your entire infrastructure.',
    bulletPoints: [
      'Structured and unstructured log support',
      'Real-time log streaming',
      'Cross-service correlation',
    ],
  },
  {
    title: 'Root Cause Analysis',
    description: 'AI-assisted root cause analysis that traces issues from symptom to source. Reduce mean time to resolution with intelligent causal chain mapping.',
    bulletPoints: [
      'Causal chain visualization',
      'AI-suggested root causes',
      'Historical pattern matching',
    ],
  },
  {
    title: 'Performance Profiling',
    description: 'Deep performance profiling with flame graphs, allocation tracking, and hot path identification. Pinpoint bottlenecks at any layer of the stack.',
    bulletPoints: [
      'CPU and memory flame graphs',
      'Allocation rate tracking',
      'Latency waterfall analysis',
    ],
  },
  {
    title: 'Debug Console',
    description: 'Interactive debug console for live inspection of running services. Execute queries, inspect state, and replay requests without redeployment.',
    bulletPoints: [
      'Live service inspection',
      'Request replay and simulation',
      'State snapshot comparison',
    ],
  },
];

const performanceStats = [
  { value: '1B+', label: 'Events indexed' },
  { value: '<2s', label: 'Query time' },
  { value: '90-day', label: 'Retention period' },
];

export function DiagnosticsPage() {
  return (
    <Layout title="Diagnostics">
      <Section>
        <SectionHeader
          title="Diagnostics"
          subtitle="Diagnostic tools, logs, and troubleshooting surfaces"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            Deep diagnostic capabilities give your engineering team the tools to find and
            fix any issue, fast. From centralized log aggregation to AI-assisted root cause
            analysis, APEX Diagnostics turns billions of events into actionable insights
            in seconds.
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
            title="Diagnose anything, instantly"
            description="Explore how APEX Diagnostics indexes billions of events and surfaces root causes in seconds."
            buttonText="Explore Diagnostics"
            buttonHref="/demo"
          />
        </div>
      </Section>
    </Layout>
  );
}
