import type { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import {
  FeatureCard,
  CTASection,
  SpecTable,
  UseCaseCard,
} from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

export interface CapabilityFeature {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly details: string;
  readonly bulletPoints: readonly string[];
}

export interface CapabilityUseCase {
  readonly title: string;
  readonly description: string;
}

export interface CapabilitySpec {
  readonly label: string;
  readonly value: string;
}

export interface CapabilityCTA {
  readonly title: string;
  readonly description: string;
  readonly buttonText: string;
  readonly buttonHref: string;
}

export interface CapabilityPageProps {
  readonly pageTitle: string;
  readonly title: string;
  readonly subtitle: string;
  readonly introText: string;
  readonly features: readonly CapabilityFeature[];
  readonly useCases: readonly CapabilityUseCase[];
  readonly technicalSpecs: readonly CapabilitySpec[];
  readonly cta: CapabilityCTA;
}

export function CapabilityPageTemplate({
  pageTitle,
  title,
  subtitle,
  introText,
  features,
  useCases,
  technicalSpecs,
  cta,
}: CapabilityPageProps) {
  return (
    <Layout title={pageTitle}>
      <Section>
        <SectionHeader title={title} subtitle={subtitle} />
        
        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>
            {introText}
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', marginTop: 'var(--space-12)' }}>
            {features.map((feature) => (
              // eslint-disable-next-line react/jsx-props-no-spreading
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>

          {/* Use Cases */}
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Use Cases</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
              {useCases.map((useCase) => (
                // eslint-disable-next-line react/jsx-props-no-spreading
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
            title={cta.title} 
            description={cta.description} 
            buttonText={cta.buttonText} 
            buttonHref={cta.buttonHref} 
          />
        </div>
      </Section>
    </Layout>
  );
}
