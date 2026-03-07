import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Universal Connectors',
    description: 'Pre-built connectors for SaaS platforms, databases, APIs, and legacy systems. Connect any data source with configuration, not code.',
    bulletPoints: [
      'Plug-and-play SaaS integrations',
      'Database and warehouse connectors',
      'Custom API adapter framework',
    ],
  },
  {
    title: 'Real-Time Sync',
    description: 'Bi-directional, event-driven synchronization keeps data consistent across all connected systems with sub-second propagation.',
    bulletPoints: [
      'Bi-directional data flow',
      'Event-driven architecture',
      'Conflict resolution policies',
    ],
  },
  {
    title: 'Data Transformation',
    description: 'Built-in mapping and transformation engine converts data between schemas, formats, and protocols without custom middleware.',
    bulletPoints: [
      'Visual schema mapper',
      'Format conversion library',
      'Custom transformation scripts',
    ],
  },
  {
    title: 'Error Recovery',
    description: 'Automatic retry, dead-letter queues, and intelligent error routing ensure no data is lost even when downstream systems fail.',
    bulletPoints: [
      'Configurable retry policies',
      'Dead-letter queue management',
      'Automatic failover routing',
    ],
  },
];

const performanceStats = [
  { value: '200+', label: 'Connectors available' },
  { value: '<100ms', label: 'Sync latency' },
  { value: '99.99%', label: 'Delivery rate' },
];

export function IntegrationsPublicPage() {
  return (
    <Layout title="Integrations">
      <Section>
        <SectionHeader
          title="Integrations"
          subtitle="Connected services and data source orchestration"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            OmniLink powers universal connectivity across your entire technology stack. With over 200
            pre-built connectors and a flexible adapter framework, APEX OmniHub connects to any system,
            syncs data in real time, and ensures reliable delivery at enterprise scale.
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
            title="Connect everything in one place"
            description="Explore the full catalog of connectors and see how OmniLink simplifies integration at scale."
            buttonText="Browse Integrations"
            buttonHref="/request-access"
          />
        </div>
      </Section>
    </Layout>
  );
}
