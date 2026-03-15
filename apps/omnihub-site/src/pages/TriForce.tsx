import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { IconConnect, IconTranslate, IconExecute } from '@/components/icons';
import {
  FeatureCard,
  CTASection,
  SpecTable,
  UseCaseCard,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const pillars = [
  {
    icon: <IconConnect size={32} />,
    title: '1. Connect',
    description: 'Modular adapters plug into any system with an interface: API, webhook, or events.',
    details: 'OmniHub\'s Connect layer uses a flexible adapter architecture that enables integration with virtually any platform. Each adapter is standalone and modular, preventing cascading failures.',
    bulletPoints: [
      'Enterprise Systems (CRMs, ERPs, ticketing, storage)',
      'AI Applications (model providers, agent frameworks, RAG pipelines)',
      'Web3 Platforms (wallet operations, tokenization, proofs)',
    ],
  },
  {
    icon: <IconTranslate size={32} />,
    title: '2. Translate',
    description: 'Canonical, typed semantic events so platforms actually understand each other.',
    details: 'The Translation layer solves the fundamental problem of cross-platform communication by converting all external events into a standardized, typed semantic format.',
    bulletPoints: [
      'Unified event schema for all integrations',
      'Type safety ensures data integrity',
      'Events carry context and intent, not just raw data',
    ],
  },
  {
    icon: <IconExecute size={32} />,
    title: '3. Execute',
    description: 'Deterministic workflows with receipts, retries, rollback paths, and MAN Mode gates.',
    details: 'The Execution layer ensures that workflows run reliably, predictably, and safely with built-in fault tolerance and human oversight.',
    bulletPoints: [
      'Deterministic, repeatable execution paths',
      'Cryptographic receipts for every operation',
      'Automatic retry with intelligent backoff',
      'Compensation & rollback for multi-step workflows',
    ],
  },
];

const useCases = [
  {
    title: 'Cross-Platform Automation',
    description: 'Automate workflows that span multiple platforms (Salesforce → Slack → Jira) with zero custom integration code.',
  },
  {
    title: 'AI Agent Orchestration',
    description: 'Connect AI agents to enterprise systems with semantic events that preserve context and intent.',
  },
  {
    title: 'Legacy System Modernization',
    description: 'Integrate legacy systems with modern platforms through adapters without modifying existing infrastructure.',
  },
  {
    title: 'Strategic Decision Support',
    description: 'Empower leadership with AI-driven insights and real-time data visualization to make high-impact strategic decisions with confidence.',
  },
];

const technicalSpecs = [
  { label: 'Event Processing', value: 'Up to 10,000 events/second per workflow' },
  { label: 'Latency', value: 'Sub-100ms translation and routing (p95)' },
  { label: 'Reliability', value: '99.9% workflow completion rate' },
  { label: 'Supported Protocols', value: 'REST, GraphQL, WebSocket, gRPC, MQTT, AMQP, Kafka' },
];

export function TriForcePage() {
  return (
    <Layout title="Tri-Force Protocol">
      <Section>
        <SectionHeader
          title="Tri-Force Protocol"
          subtitle="Connect, Translate, Execute"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            The Tri-Force Protocol is the foundational architecture powering every OmniHub workflow.
            It provides a three-pillar approach to enterprise integration that ensures seamless communication
            between disparate systems while maintaining reliability, observability, and control.
          </p>

          {/* The Three Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', marginTop: 'var(--space-12)' }}>
            {pillars.map((pillar) => (
              <FeatureCard key={pillar.title} {...pillar} />
            ))}
          </div>

          {/* Use Cases */}
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Use Cases</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
              {useCases.map((useCase) => (
                <UseCaseCard key={useCase.title} {...useCase} />
              ))}
            </div>
          </div>

          {/* Technical Specs */}
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Technical Specifications</h2>
            <SpecTable specs={technicalSpecs} />
          </div>

          {/* CTA */}
          <CTASection
            title="Ready to get started?"
            description="Learn more about building with the Tri-Force Protocol in our technical documentation."
            buttonText="View Technical Specs"
            buttonHref="/tech-specs"
          />
        </div>
      </Section>
    </Layout>
  );
}
