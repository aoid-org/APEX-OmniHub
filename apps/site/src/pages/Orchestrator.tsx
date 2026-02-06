import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Single Control Plane',
    description: 'Unified interface for managing all integrations, workflows, and policies from one location. Eliminate integration silos and reduce operational complexity.',
    bulletPoints: [
      'Centralized configuration',
      'Real-time visibility dashboard',
      'Global policy enforcement',
    ],
  },
  {
    title: 'Real-Time Event Correlation',
    description: 'Track and correlate every event from source to destination with unprecedented visibility into your operations.',
    bulletPoints: [
      'Global correlation IDs',
      'Cross-system tracing',
      'Performance metrics tracking',
    ],
  },
  {
    title: 'Automatic Retry & Compensation',
    description: 'Intelligent failure handling with configurable retry policies and automatic compensation workflows ensures reliability.',
    bulletPoints: [
      'Exponential backoff',
      'Circuit breaker patterns',
      'Saga pattern rollback',
    ],
  },
  {
    title: 'State Persistence & Recovery',
    description: 'Never lose progress with continuous checkpointing and automatic recovery from any failure point.',
    bulletPoints: [
      'Continuous checkpointing',
      'Point-in-time recovery',
      'Automatic resumption',
    ],
  },
];

const performanceStats = [
  { value: '100K+', label: 'Events/second' },
  { value: '<10ms', label: 'Orchestration overhead' },
  { value: '99.99%', label: 'Uptime SLA' },
];

export function OrchestratorPage() {
  return (
    <Layout title="Orchestrator">
      <Section>
        <SectionHeader
          title="The Orchestrator"
          subtitle="Central command for all workflows"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            The Orchestrator is the beating heart of APEX OmniHub. It serves as the central control plane
            that coordinates all integrations, manages workflow execution, and provides comprehensive observability
            across your entire operation.
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
            title="See the Orchestrator in action"
            description="Watch how the Orchestrator coordinates complex multi-system workflows with ease."
            buttonText="Watch Demo"
            buttonHref="/demo.html"
          />
        </div>
      </Section>
    </Layout>
  );
}
