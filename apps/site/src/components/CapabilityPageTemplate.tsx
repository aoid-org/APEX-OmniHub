import type { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { FeatureCard, CTASection, SpecTable, UseCaseCard } from '@/components/CapabilityPageComponents';
import '../styles/capability-pages.css';

// Base interface for title/description pattern
interface TitleDescriptionPair { readonly title: string; readonly description: string; }

// Base interface for label/value pattern
interface LabelValuePair { readonly label: string; readonly value: string; }

// Exported interfaces using composition
export interface CapabilityFeature extends TitleDescriptionPair {
  readonly icon: ReactNode;
  readonly details: string;
  readonly bulletPoints: readonly string[];
}

export type CapabilityUseCase = TitleDescriptionPair;

export type CapabilitySpec = LabelValuePair;

export interface CapabilityCTA extends TitleDescriptionPair {
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

export function CapabilityPageTemplate({ pageTitle, title, subtitle, introText, features, useCases, technicalSpecs, cta }: CapabilityPageProps) {
  return (
    <Layout title={pageTitle}>
      <Section>
        <SectionHeader title={title} subtitle={subtitle} />
        <div className="page-content">
          <p className="text-lg mb-8" style={{ lineHeight: '1.75' }}>{introText}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', marginTop: 'var(--space-12)' }}>
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Use Cases</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
              {useCases.map((u) => <UseCaseCard key={u.title} {...u} />)}
            </div>
          </div>
          <div className="section-spacing">
            <h2 className="heading-2 mb-8">Technical Specifications</h2>
            <SpecTable specs={technicalSpecs} />
          </div>
          <CTASection {...cta} />
        </div>
      </Section>
    </Layout>
  );
}
