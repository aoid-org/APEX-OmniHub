import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Intent-Based Automation',
    description: 'Describe what you want to automate in natural language. APEX interprets your intent, selects the right actions, and builds the workflow automatically.',
    bulletPoints: [
      'Natural language workflow creation',
      'Automatic action selection',
      'Continuous learning from feedback',
    ],
  },
  {
    title: 'Smart Scheduling',
    description: 'Intelligent scheduling that adapts to system load, dependencies, and business calendars. Automations run at the optimal time, every time.',
    bulletPoints: [
      'Load-aware execution windows',
      'Dependency-based ordering',
      'Business calendar integration',
    ],
  },
  {
    title: 'Error Handling',
    description: 'Resilient execution with automatic retries, fallback paths, and human-in-the-loop escalation when intervention is needed.',
    bulletPoints: [
      'Configurable retry strategies',
      'Fallback workflow paths',
      'Escalation and approval gates',
    ],
  },
  {
    title: 'Audit Trail',
    description: 'Complete, immutable audit trail for every automation run. Track who triggered what, when it ran, and exactly what changed.',
    bulletPoints: [
      'Immutable execution logs',
      'Change-level attribution',
      'Compliance-ready reporting',
    ],
  },
];

const performanceStats = [
  { value: '10,000+', label: 'Automations per day' },
  { value: '99.8%', label: 'Success rate' },
  { value: '42h', label: 'Saved weekly' },
];

export function AutomationsPublicPage() {
  return (
    <Layout title="Automations">
      <Section>
        <SectionHeader
          title="Automations"
          subtitle="Workflow automation and task orchestration controls"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            APEX OmniHub's AI-powered automation engine learns from your operations and adapts over time.
            From simple scheduled tasks to complex multi-system workflows, automations run reliably with
            built-in error handling, auditing, and intelligent optimization.
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
            title="Automate with confidence"
            description="See how AI-powered automations can eliminate repetitive work and free your team to focus on what matters."
            buttonText="Start Automating"
            buttonHref="/request-access"
          />
        </div>
      </Section>
    </Layout>
  );
}
