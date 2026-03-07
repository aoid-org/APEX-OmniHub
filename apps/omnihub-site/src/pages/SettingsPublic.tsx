import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Role Management',
    description: 'Fine-grained role-based access control with 12 built-in roles and custom role creation. Assign permissions at the organization, team, or resource level.',
    bulletPoints: [
      '12 pre-configured roles',
      'Custom role builder',
      'Resource-level permissions',
    ],
  },
  {
    title: 'Security Policies',
    description: 'Centralized security policy management including SSO configuration, MFA enforcement, IP allowlisting, and session controls.',
    bulletPoints: [
      'SSO and SAML integration',
      'MFA enforcement policies',
      'IP allowlist management',
    ],
  },
  {
    title: 'API Configuration',
    description: 'Manage API keys, rate limits, webhook endpoints, and authentication tokens from a single control panel with versioned configuration.',
    bulletPoints: [
      'API key lifecycle management',
      'Per-endpoint rate limiting',
      'Webhook configuration and testing',
    ],
  },
  {
    title: 'Team Settings',
    description: 'Organize users into teams with shared configurations, notification preferences, and workspace customization options.',
    bulletPoints: [
      'Team-based configuration inheritance',
      'Notification channel management',
      'Workspace personalization',
    ],
  },
];

const performanceStats = [
  { value: 'RBAC', label: 'With 12 built-in roles' },
  { value: 'Versioned', label: 'Configuration history' },
  { value: 'Instant', label: 'Config propagation' },
];

export function SettingsPublicPage() {
  return (
    <Layout title="Settings">
      <Section>
        <SectionHeader
          title="Platform Settings"
          subtitle="Platform configuration and operational preferences"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            Centralized platform configuration gives administrators full control over security policies,
            role assignments, API settings, and team preferences. Every configuration change is versioned,
            audited, and propagated instantly across all connected services.
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
            title="Take control of your platform"
            description="See how centralized configuration simplifies administration and strengthens security."
            buttonText="Configure Your Platform"
            buttonHref="/request-access"
          />
        </div>
      </Section>
    </Layout>
  );
}
