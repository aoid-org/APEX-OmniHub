import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Real-Time Monitoring',
    description: 'Continuous health monitoring across every service, endpoint, and resource. Live dashboards surface issues the moment they arise.',
    bulletPoints: [
      'Sub-second metric collection',
      'Custom health check definitions',
      'Live status dashboards',
    ],
  },
  {
    title: 'Anomaly Detection',
    description: 'AI-driven anomaly detection that learns your system\'s normal behavior and flags deviations before they become incidents.',
    bulletPoints: [
      'Baseline learning algorithms',
      'Multi-dimensional analysis',
      'Predictive alerting',
    ],
  },
  {
    title: 'Auto-Recovery',
    description: 'Automated recovery procedures triggered by health check failures. Self-healing infrastructure that resolves common issues without human intervention.',
    bulletPoints: [
      'Automated restart policies',
      'Failover orchestration',
      'Graceful degradation paths',
    ],
  },
  {
    title: 'Health Reports',
    description: 'Scheduled and on-demand health reports with trend analysis. Share system status with stakeholders in clear, actionable formats.',
    bulletPoints: [
      'Automated weekly summaries',
      'Trend and regression analysis',
      'Stakeholder-friendly formatting',
    ],
  },
];

const performanceStats = [
  { value: '99.97%', label: 'Platform uptime' },
  { value: '<30s', label: 'Incident detection' },
  { value: '24/7', label: 'Continuous monitoring' },
];

export function HealthPage() {
  return (
    <Layout title="System Health">
      <Section>
        <SectionHeader
          title="System Health"
          subtitle="System health summary and runtime diagnostics"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            Real-time system health monitoring gives you complete visibility into the
            operational state of every component. AI-powered anomaly detection identifies
            issues before they impact users, while auto-recovery keeps your platform running
            at peak performance around the clock.
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
            title="Always-on health monitoring"
            description="See how APEX detects and resolves issues before they impact your users."
            buttonText="View System Health"
            buttonHref="/demo"
          />
        </div>
      </Section>
    </Layout>
  );
}
