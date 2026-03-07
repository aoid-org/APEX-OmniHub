import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Secure Storage',
    description: 'Enterprise-grade file storage with AES-256 encryption at rest and in transit. Data residency controls ensure compliance with regional regulations.',
    bulletPoints: [
      'AES-256 encryption at rest',
      'TLS 1.3 in-transit encryption',
      'Data residency controls',
    ],
  },
  {
    title: 'Version Control',
    description: 'Full version history for every document. Compare revisions, restore previous versions, and track changes with complete attribution.',
    bulletPoints: [
      'Unlimited version history',
      'Side-by-side diff comparison',
      'One-click version restoration',
    ],
  },
  {
    title: 'Access Governance',
    description: 'Granular access policies with role-based permissions, time-limited sharing, and detailed access logs for compliance auditing.',
    bulletPoints: [
      'Role-based access control',
      'Time-limited share links',
      'Access audit logging',
    ],
  },
  {
    title: 'Search & Discovery',
    description: 'Instant full-text search across all documents with AI-powered tagging, metadata extraction, and intelligent content recommendations.',
    bulletPoints: [
      'Full-text content indexing',
      'AI-powered auto-tagging',
      'Smart content recommendations',
    ],
  },
];

const performanceStats = [
  { value: '50GB', label: 'Included storage' },
  { value: 'AES-256', label: 'Encryption standard' },
  { value: 'Instant', label: 'Full-text search' },
];

export function FilesPublicPage() {
  return (
    <Layout title="Files">
      <Section>
        <SectionHeader
          title="File Management"
          subtitle="Document management and file operations"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            APEX OmniHub provides secure, governed document management built for enterprise workflows.
            Every file is encrypted, versioned, and searchable, with granular access controls that
            keep your data safe while making it effortlessly discoverable.
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
            title="Manage files with confidence"
            description="Discover how APEX OmniHub keeps your documents secure, versioned, and instantly accessible."
            buttonText="Explore File Management"
            buttonHref="/request-access"
          />
        </div>
      </Section>
    </Layout>
  );
}
