import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Single Port Gateway',
    description: 'All external traffic flows through one unified gateway. Simplify firewall rules, reduce attack surface, and centralize traffic management.',
    bulletPoints: [
      'Unified ingress and egress',
      'Simplified network configuration',
      'Centralized rate limiting',
    ],
  },
  {
    title: 'Protocol Translation',
    description: 'Seamlessly bridge REST, GraphQL, gRPC, WebSocket, and legacy protocols. OmniLink translates on the fly so systems speak each other\'s language.',
    bulletPoints: [
      'Automatic protocol detection',
      'Bi-directional translation',
      'Schema-aware conversion',
    ],
  },
  {
    title: 'Health Monitoring',
    description: 'Continuous health checks for every connected endpoint. Detect degradation early and route traffic away from unhealthy services automatically.',
    bulletPoints: [
      'Active and passive health checks',
      'Latency and error-rate thresholds',
      'Automatic traffic rerouting',
    ],
  },
  {
    title: 'Auto-Reconnect',
    description: 'Persistent connections that survive network interruptions. OmniLink automatically re-establishes links with exponential backoff and state recovery.',
    bulletPoints: [
      'Exponential backoff reconnection',
      'Session state preservation',
      'Zero-message-loss guarantees',
    ],
  },
];

const performanceStats = [
  { value: '18', label: 'Protocols supported' },
  { value: '<1ms', label: 'Routing latency' },
  { value: 'Zero', label: 'Downtime deployments' },
];

export function LinksPublicPage() {
  return (
    <Layout title="OmniLink">
      <Section>
        <SectionHeader
          title="OmniLink"
          subtitle="Connection management and integration endpoints"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            OmniLink's single-port architecture consolidates all connectivity into one intelligent gateway.
            Every protocol, every endpoint, every connection flows through a unified layer that handles
            translation, monitoring, and recovery automatically with zero-downtime deployment.
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
            title="Simplify your connectivity"
            description="Learn how OmniLink's single-port architecture eliminates integration complexity."
            buttonText="Learn About OmniLink"
            buttonHref="/tech-specs"
          />
        </div>
      </Section>
    </Layout>
  );
}
