import { Layout, Section, SectionHeader } from '@/components';
import {
  InfoCard,
  CTASection,
  StatsGrid,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

const capabilities = [
  {
    title: 'Semantic Translation',
    description: 'Go beyond literal text conversion with context-aware semantic translation that preserves meaning, tone, and domain-specific terminology across systems.',
    bulletPoints: [
      'Domain-specific glossaries',
      'Contextual tone matching',
      'Idiomatic expression handling',
    ],
  },
  {
    title: 'Language Detection',
    description: 'Automatically identify source languages with high confidence, including support for mixed-language content and regional dialect recognition.',
    bulletPoints: [
      'Multi-script detection',
      'Mixed-language parsing',
      'Dialect and variant identification',
    ],
  },
  {
    title: 'Quality Scoring',
    description: 'Every translation receives a real-time quality score based on fluency, adequacy, and consistency metrics, ensuring output meets your standards.',
    bulletPoints: [
      'Fluency and adequacy metrics',
      'Consistency checks across documents',
      'Automated regression testing',
    ],
  },
  {
    title: 'Context Preservation',
    description: 'Maintain formatting, metadata, and structural context through every translation pass. What goes in structured comes out structured.',
    bulletPoints: [
      'Markup and tag preservation',
      'Metadata pass-through',
      'Structural integrity validation',
    ],
  },
];

const performanceStats = [
  { value: '40+', label: 'Languages supported' },
  { value: '<200ms', label: 'Translation latency' },
  { value: '99.2%', label: 'Accuracy rate' },
];

export function TranslationPage() {
  return (
    <Layout title="Translation">
      <Section>
        <SectionHeader
          title="Translation"
          subtitle="Localization tools and language quality controls"
        />

        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            APEX's semantic translation engine goes beyond word-for-word conversion. It understands context,
            preserves meaning, and ensures cross-system communication maintains fidelity across languages,
            formats, and domains.
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
            title="Experience intelligent translation"
            description="See how APEX's semantic engine delivers accurate, context-aware translations at scale."
            buttonText="See Translation in Action"
            buttonHref="/demo"
          />
        </div>
      </Section>
    </Layout>
  );
}
